import { createHash } from 'crypto';
import { prepareKakaoLoginState, exchangeKakaoLoginCode } from '../kakaoLogin';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytes: (n: number) => new Uint8Array(require('crypto').randomBytes(n)),
  digestStringAsync: async (_alg: string, value: string) =>
    require('crypto').createHash('sha256').update(value).digest('hex')
}));

describe('kakao login binding', () => {
  const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ token: 't', user: { id: 1 } }) }) as unknown as Response);

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('state의 challenge는 교환 때 보내는 verifier의 SHA-256이고, verifier는 한 번만 쓴다', async () => {
    const state = await prepareKakaoLoginState();
    const challenge = state.slice(state.lastIndexOf('|') + 1);

    await expect(exchangeKakaoLoginCode('code-1')).resolves.toEqual({ token: 't', user: { id: 1 } });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.code).toBe('code-1');
    expect(createHash('sha256').update(body.verifier).digest('hex')).toBe(challenge);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();

    await expect(exchangeKakaoLoginCode('code-2')).rejects.toThrow();
  });
});
