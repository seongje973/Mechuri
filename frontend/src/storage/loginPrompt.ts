import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * "카카오로 저장하기" 바텀시트를 언제 띄울지 정한다 (US-17).
 * - 게스트가 마이페이지에 들어왔을 때, 즐겨찾기를 3개째 저장했을 때만
 * - 닫으면 7일 동안 다시 묻지 않는다
 * - 추천 흐름 중에는 띄우지 않는다: 추천 화면은 이 모듈을 직접 부르지 말고 저장소(toggleFavorite)만 쓴다
 * 시트 자체는 AppNavigator가 그린다. 화면은 requestLoginPrompt()만 부른다.
 */

export type LoginPromptReason = 'mypage' | 'favorite';

export const DISMISS_KEY = 'login_prompt_dismissed_at';
export const DISMISS_DAYS = 7;
export const FAVORITE_PROMPT_COUNT = 3;

type Listener = (reason: LoginPromptReason) => void;
const listeners = new Set<Listener>();

/** AppNavigator가 시트를 열려고 구독한다. 반환값으로 구독 해제 */
export const onLoginPrompt = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const isLoginPromptSnoozed = async (now = Date.now()): Promise<boolean> => {
  const raw = await AsyncStorage.getItem(DISMISS_KEY);
  const at = raw ? Number(raw) : NaN;
  return Number.isFinite(at) && now - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

export const snoozeLoginPrompt = (now = Date.now()) => AsyncStorage.setItem(DISMISS_KEY, String(now));

/** 7일 안에 닫은 적이 없으면 시트를 연다. 열었으면 true */
export const requestLoginPrompt = async (reason: LoginPromptReason): Promise<boolean> => {
  if (!listeners.size || (await isLoginPromptSnoozed())) return false;
  listeners.forEach(listener => listener(reason));
  return true;
};

/** 게스트 즐겨찾기 저장 후 저장소가 부른다. 정확히 3개째일 때만 묻는다 */
export const notifyFavoriteSaved = (count: number) => {
  if (count === FAVORITE_PROMPT_COUNT) void requestLoginPrompt('favorite');
};
