import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_PORT = 5000;

const TOKEN_KEY = 'auth_token';
const PROFILE_KEY = 'user_profile';

// Expo 개발 서버 주소 (예: "192.168.0.12:8081"). 실기기도 같은 와이파이면 이 IP로 서버에 닿는다.
const EXPO_HOST_URI: string | undefined = Constants.expoConfig?.hostUri;

/** 카카오 로그인 후 돌아올 Expo 개발 서버 주소 */
export const DEV_SERVER_HOST: string =
  EXPO_HOST_URI ?? (Platform.OS === 'android' ? '10.0.2.2:8081' : '127.0.0.1:8081');

/**
 * 서버 주소 결정 순서
 * 1. EXPO_PUBLIC_API_URL (frontend/.env) — 터널, 배포 서버 등
 * 2. Expo 개발 서버의 IP + 5000 — 같은 와이파이의 실기기, 에뮬레이터 모두
 * 3. 에뮬레이터 기본값 (Android 10.0.2.2, 그 외 localhost)
 */
const resolveApiBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const devIp = EXPO_HOST_URI?.split(':')[0];
  if (devIp) return `http://${devIp}:${SERVER_PORT}`;

  return Platform.OS === 'android'
    ? `http://10.0.2.2:${SERVER_PORT}`
    : `http://localhost:${SERVER_PORT}`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** 객체를 넘기면 JSON으로 보낸다 */
  body?: unknown;
  /** 저장된 토큰이 있으면 Authorization 헤더를 붙인다 (기본 true) */
  auth?: boolean;
  /** 밀리초. 넘기면 그 시간 뒤 요청을 끊는다 */
  timeoutMs?: number;
}

/**
 * 서버 호출은 모두 이 함수를 쓴다. 경로만 넘기면 서버 주소와 토큰을 붙여 준다.
 * 응답은 fetch와 같은 Response 이므로 화면에서는 res.ok / res.json()을 그대로 쓴다.
 */
export const apiFetch = async (path: string, options: ApiRequestOptions = {}): Promise<Response> => {
  const { body, auth = true, timeoutMs, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string>) };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  if (auth) {
    const token = await getAuthToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller?.signal ?? rest.signal,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// --- 로그인 세션 저장소 ---

export const getAuthToken = () => AsyncStorage.getItem(TOKEN_KEY);

export const getStoredProfile = async (): Promise<any | null> => {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const saveSession = async (token: string, user: unknown) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
};

export const saveProfile = (user: unknown) => AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));

export const clearSession = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(PROFILE_KEY);
};
