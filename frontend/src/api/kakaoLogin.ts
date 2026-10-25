import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import * as Crypto from 'expo-crypto';
import { DEV_SERVER_HOST, apiFetch } from './client';
import { KAKAO_CLIENT_ID, KAKAO_REDIRECT_URI } from '../constants/env';

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

/** 카카오 인증 페이지를 브라우저로 연다. 로그인이 끝나면 서버가 딥링크로 앱을 다시 연다 (AppNavigator가 받음) */
export const openKakaoLogin = async (): Promise<void> => {
  if (!KAKAO_CLIENT_ID) throw new Error('EXPO_PUBLIC_KAKAO_CLIENT_ID is not set');
  // state = Expo 개발 서버 주소 + 이 앱에 로그인을 묶는 challenge. 서버가 로그인 후 앱을 다시 연다 (실기기 포함)
  const state = encodeURIComponent(await prepareKakaoLoginState());
  const redirectUri = encodeURIComponent(KAKAO_REDIRECT_URI);
  await Linking.openURL(
    `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&state=${state}`
  );
};

/** 개발용 간편 로그인 (서버도 운영에서는 막음). 카카오 검증 없이 임의 계정을 만든다 */
export const devKakaoLogin = async (): Promise<{ token: string; user: any }> => {
  const randomId = Math.floor(Math.random() * 100000);
  const res = await apiFetch('/api/auth/kakao/mobile', {
    method: 'POST',
    body: { id: randomId, email: `kakao_${randomId}@kakaomail.com`, nickname: '카카오 미식가 💛' },
    auth: false,
    timeoutMs: 3000
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Dev login failed (${res.status})`);
  return data;
};
