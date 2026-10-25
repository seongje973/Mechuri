import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { DEV_SERVER_HOST, apiFetch } from './client';

// 카카오 로그인을 이 앱에 묶는 값 (PKCE 방식). verifier는 기기에만 두고, 그 해시(challenge)만 state로 보낸다.
const VERIFIER_KEY = 'kakao_login_verifier';

const toHex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/** 카카오 인증 URL에 넣을 state. "<Expo 개발 서버 호스트>|<challenge>" */
export const prepareKakaoLoginState = async (): Promise<string> => {
  const verifier = toHex(Crypto.getRandomBytes(32));
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  await AsyncStorage.setItem(VERIFIER_KEY, verifier);
  return `${DEV_SERVER_HOST}|${challenge}`;
};

/** 딥링크로 받은 1회용 코드를 이 앱의 verifier와 함께 토큰으로 바꾼다 */
export const exchangeKakaoLoginCode = async (code: string): Promise<{ token: string; user: any }> => {
  const verifier = await AsyncStorage.getItem(VERIFIER_KEY);
  await AsyncStorage.removeItem(VERIFIER_KEY);
  if (!verifier) throw new Error('No Kakao login in progress on this device');

  const res = await apiFetch('/api/auth/kakao/exchange', {
    method: 'POST',
    body: { code, verifier },
    auth: false,
    timeoutMs: 8000
  });
  if (!res.ok) throw new Error(`Login code exchange failed (${res.status})`);
  return res.json();
};
