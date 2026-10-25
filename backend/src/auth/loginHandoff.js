const crypto = require('crypto');
const { Op } = require('sequelize');

// 카카오 로그인 후 앱으로 돌아갈 때 JWT 대신 넘기는 1회용 코드.
// 딥링크 URL은 브라우저 기록·로그·다른 앱에 남을 수 있으므로, 토큰은 앱이 이 코드로 POST해서 받는다.
// 코드는 로그인을 시작한 앱에 묶인다 (PKCE 방식): 앱이 만든 verifier의 SHA-256(challenge)을 state로 보내고,
// 교환할 때 verifier를 같이 내야 한다. 코드만 가로챈 사람도, 남의 코드를 내 앱에 밀어 넣는 공격도 막힌다.
const CODE_TTL_MS = 60 * 1000;

const CHALLENGE_PATTERN = /^[0-9a-f]{64}$/;

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

// 코드 저장소. save(codeHash, entry), take(codeHash) → entry | null (꺼내면서 지운다), sweep(now)
// 운영은 DB(LoginCodes 테이블)라서 서버가 여러 대이거나 재시작해도 코드가 살아 있다. 테스트는 메모리 저장소를 쓴다.
// 코드 원문은 저장하지 않고 SHA-256만 키로 쓴다. DB가 새도 그 값으로는 교환할 수 없다.
const createMemoryLoginCodeStore = () => {
  const entries = new Map(); // codeHash -> { payload, challenge, expiresAt }
  return {
    async save(codeHash, entry) {
      entries.set(codeHash, entry);
    },
    async take(codeHash) {
      const entry = entries.get(codeHash);
      entries.delete(codeHash);
      return entry || null;
    },
    async sweep(now) {
      for (const [codeHash, entry] of entries) {
        if (entry.expiresAt <= now) entries.delete(codeHash);
      }
    }
  };
};

const createDbLoginCodeStore = (LoginCode) => {
  const { sequelize } = LoginCode;
  const table = sequelize.getQueryInterface().quoteIdentifier(LoginCode.getTableName());
  return {
    async save(codeHash, { payload, challenge, expiresAt }) {
      await LoginCode.create({ codeHash, payload, challenge, expiresAt: new Date(expiresAt) });
    },
    // DELETE ... RETURNING 한 문장으로 꺼내야 동시에 두 번 교환해도 한쪽만 성공한다
    async take(codeHash) {
      const [row] = await sequelize.query(
        `DELETE FROM ${table} WHERE "codeHash" = :codeHash RETURNING "payload", "challenge", "expiresAt"`,
        { replacements: { codeHash }, type: sequelize.QueryTypes.SELECT }
      );
      return row ? { payload: row.payload, challenge: row.challenge, expiresAt: new Date(row.expiresAt).getTime() } : null;
    },
    async sweep(now) {
      await LoginCode.destroy({ where: { expiresAt: { [Op.lte]: new Date(now) } } });
    }
  };
};

let store = null;
const getStore = () => {
  if (!store) store = createDbLoginCodeStore(require('../models/LoginCode'));
  return store;
};
/** 테스트에서 메모리 저장소로 바꿀 때 쓴다 */
const setLoginCodeStore = (next) => {
  store = next;
};

const createLoginCode = async (payload, challenge, now = Date.now()) => {
  if (!CHALLENGE_PATTERN.test(challenge || '')) throw new Error('Invalid login challenge.');
  const codes = getStore();
  await codes.sweep(now);
  const code = crypto.randomBytes(32).toString('hex');
  await codes.save(sha256Hex(code), { payload, challenge, expiresAt: now + CODE_TTL_MS });
  return code;
};

/** 코드는 한 번만 시도할 수 있다. 없거나, 만료됐거나, verifier가 맞지 않으면 null */
const redeemLoginCode = async (code, verifier, now = Date.now()) => {
  if (typeof code !== 'string' || typeof verifier !== 'string') return null;
  const entry = await getStore().take(sha256Hex(code));
  if (!entry || entry.expiresAt <= now) return null;
  const expected = Buffer.from(entry.challenge, 'hex');
  const actual = Buffer.from(sha256Hex(verifier), 'hex');
  return crypto.timingSafeEqual(expected, actual) ? entry.payload : null;
};

/** state = "<Expo 개발 서버 호스트>|<challenge>". 호스트는 비어 있을 수 있다 */
const parseLoginState = (state) => {
  if (typeof state !== 'string') return { host: undefined, challenge: undefined };
  const sep = state.lastIndexOf('|');
  if (sep < 0) return { host: state || undefined, challenge: undefined };
  return { host: state.slice(0, sep) || undefined, challenge: state.slice(sep + 1) };
};

const isValidChallenge = (challenge) => CHALLENGE_PATTERN.test(challenge || '');

// Expo 개발 서버로 돌아갈 주소는 로컬·사설망 IP나 EXPO_DEV_HOSTS에 적은 호스트만 허용한다.
// 아무 호스트나 받으면 로그인 링크의 state를 바꿔 다른 서버로 코드를 빼돌릴 수 있다.
const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})$/;
const HOST_WITH_PORT = /^([A-Za-z0-9.-]{1,253})(?::(\d{1,5}))?$/;

const resolveDevReturnHost = (host, env = process.env) => {
  if (env.NODE_ENV === 'production' || typeof host !== 'string') return null;
  const match = HOST_WITH_PORT.exec(host);
  if (!match) return null;
  const allowList = (env.EXPO_DEV_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean);
  return PRIVATE_HOST.test(match[1]) || allowList.includes(match[1]) ? host : null;
};

/** 앱으로 돌아갈 딥링크. 개발 서버 주소가 허용되면 Expo Go(exp://)로, 아니면 앱 스킴으로 */
const buildAppReturnUrl = (code, host, env = process.env) => {
  const devHost = resolveDevReturnHost(host, env);
  const query = `auth?code=${encodeURIComponent(code)}`;
  return devHost ? `exp://${devHost}/--/${query}` : `mechuri://${query}`;
};

module.exports = {
  createLoginCode,
  redeemLoginCode,
  createMemoryLoginCodeStore,
  createDbLoginCodeStore,
  setLoginCodeStore,
  parseLoginState,
  isValidChallenge,
  resolveDevReturnHost,
  buildAppReturnUrl,
  sha256Hex,
  CODE_TTL_MS
};
