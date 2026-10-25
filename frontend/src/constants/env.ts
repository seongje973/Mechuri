import { API_BASE_URL } from '../api/client';

export const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_CLIENT_ID || '';
export const KAKAO_REDIRECT_URI =
  process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI || `${API_BASE_URL}/api/auth/kakao/callback`;
