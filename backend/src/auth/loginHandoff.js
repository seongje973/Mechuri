const crypto = require('crypto');

// 카카오 로그인 후 앱으로 돌아갈 때 JWT 대신 넘기는 1회용 코드.
// 딥링크 URL은 브라우저 기록·로그·다른 앱에 남을 수 있으므로, 토큰은 앱이 이 코드로 POST해서 받는다.
const CODE_TTL_MS = 60 * 1000;
const pendingLogins = new Map(); // code -> { payload, expiresAt }  (서버 1대 기준 메모리 저장)

const sweepExpired = (now) => {
  for (const [code, entry] of pendingLogins) {
    if (entry.expiresAt <= now) pendingLogins.delete(code);
  }
};

const createLoginCode = (payload, now = Date.now()) => {
  sweepExpired(now);
  const code = crypto.randomBytes(32).toString('hex');
  pendingLogins.set(code, { payload, expiresAt: now + CODE_TTL_MS });
  return code;
};

/** 코드는 한 번만 쓸 수 있다. 없거나 만료됐으면 null */
const redeemLoginCode = (code, now = Date.now()) => {
  if (typeof code !== 'string') return null;
  const entry = pendingLogins.get(code);
  pendingLogins.delete(code);
  if (!entry || entry.expiresAt <= now) return null;
  return entry.payload;
};

// Expo 개발 서버로 돌아갈 주소(state)는 로컬·사설망 IP나 EXPO_DEV_HOSTS에 적은 호스트만 허용한다.
// 아무 호스트나 받으면 로그인 링크의 state를 바꿔 다른 서버로 코드를 빼돌릴 수 있다.
const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})$/;
const HOST_WITH_PORT = /^([A-Za-z0-9.-]{1,253})(?::(\d{1,5}))?$/;

const resolveDevReturnHost = (state, env = process.env) => {
  if (env.NODE_ENV === 'production' || typeof state !== 'string') return null;
  const match = HOST_WITH_PORT.exec(state);
  if (!match) return null;
  const host = match[1];
  const allowList = (env.EXPO_DEV_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean);
  return PRIVATE_HOST.test(host) || allowList.includes(host) ? state : null;
};

/** 앱으로 돌아갈 딥링크. 개발 서버 주소가 허용되면 Expo Go(exp://)로, 아니면 앱 스킴으로 */
const buildAppReturnUrl = (code, state, env = process.env) => {
  const devHost = resolveDevReturnHost(state, env);
  const query = `auth?code=${encodeURIComponent(code)}`;
  return devHost ? `exp://${devHost}/--/${query}` : `mechuri://${query}`;
};

module.exports = { createLoginCode, redeemLoginCode, resolveDevReturnHost, buildAppReturnUrl, CODE_TTL_MS };
