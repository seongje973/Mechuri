import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getAuthToken } from '../api/client';
import { notifyFavoriteSaved } from './loginPrompt';

/**
 * 식사 기록·즐겨찾기·기피 태그 저장소. 화면은 로그인 여부를 몰라도 된다.
 * - 로그인(토큰 있음): 서버 /api/user/* 에 저장
 * - 게스트(토큰 없음): 이 기기(AsyncStorage)에 저장. 서버를 부르지 않으므로 401도 없다
 * 로그인하면 importGuestData()가 기기 기록을 서버로 옮기고 기기 쪽을 비운다.
 */

export interface HistoryEntry {
  menuName: string;
  emoji?: string | null;
  restaurantName?: string | null;
  category?: string | null;
  /** ISO 시각 */
  createdAt: string;
}

export interface FavoriteEntry {
  menuName: string;
  emoji?: string | null;
  category?: string | null;
  createdAt: string;
}

export type NewHistory = Omit<HistoryEntry, 'createdAt'>;
export type NewFavorite = Omit<FavoriteEntry, 'createdAt'>;

export interface UserStats {
  eatenCount: number;
  favoritesCount: number;
  avoidCount: number;
}

export const GUEST_KEYS = {
  histories: 'guest_histories',
  favorites: 'guest_favorites',
  avoidTags: 'guest_avoid_tags',
} as const;

/** 서버도 최근 50개만 돌려준다 */
export const HISTORY_LIMIT = 50;

export const isGuest = async () => !(await getAuthToken());

const readList = async <T>(key: string): Promise<T[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeList = (key: string, list: unknown[]) => AsyncStorage.setItem(key, JSON.stringify(list));

const requestJson = async (path: string, init: Parameters<typeof apiFetch>[1] = {}) => {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed (${res.status})`);
  return res.json();
};

const toHistory = (h: any): HistoryEntry => ({
  menuName: h.menuName,
  emoji: h.emoji ?? null,
  restaurantName: h.restaurantName ?? null,
  category: h.category ?? null,
  createdAt: h.createdAt,
});

const toFavorite = (f: any): FavoriteEntry => ({
  menuName: f.menuName,
  emoji: f.emoji ?? null,
  category: f.category ?? null,
  createdAt: f.createdAt,
});

export const parseAvoidTags = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return Array.from(new Set(list.map(t => String(t).trim()).filter(Boolean)));
};

// --- 식사 기록 ---

/** 최신순 */
export const getHistories = async (): Promise<HistoryEntry[]> => {
  if (await isGuest()) return readList<HistoryEntry>(GUEST_KEYS.histories);
  const data = await requestJson('/api/user/histories');
  return (data.histories ?? []).map(toHistory);
};

// 게스트 기록은 읽고-고쳐-쓰기라 저장이 겹치면 앞 기록이 사라진다. 하나씩 차례로 쓴다
let guestHistoryQueue: Promise<unknown> = Promise.resolve();

export const addHistory = async (entry: NewHistory): Promise<void> => {
  if (await isGuest()) {
    const run = guestHistoryQueue.then(async () => {
      const list = await readList<HistoryEntry>(GUEST_KEYS.histories);
      const next = [{ ...entry, createdAt: new Date().toISOString() }, ...list].slice(0, HISTORY_LIMIT);
      await writeList(GUEST_KEYS.histories, next);
    });
    guestHistoryQueue = run.catch(() => undefined);
    await run;
    return;
  }
  await requestJson('/api/user/histories', { method: 'POST', body: entry });
};

export const clearHistories = async (): Promise<void> => {
  if (await isGuest()) {
    await AsyncStorage.removeItem(GUEST_KEYS.histories);
    return;
  }
  await requestJson('/api/user/histories', { method: 'DELETE' });
};

// --- 즐겨찾기 ---

/** 최신순 */
export const getFavorites = async (): Promise<FavoriteEntry[]> => {
  if (await isGuest()) return readList<FavoriteEntry>(GUEST_KEYS.favorites);
  const data = await requestJson('/api/user/favorites');
  return (data.favorites ?? []).map(toFavorite);
};

export const isFavorite = async (menuName: string): Promise<boolean> =>
  (await getFavorites()).some(f => f.menuName === menuName);

/**
 * 있으면 빼고 없으면 넣는다. 결과로 지금 즐겨찾기 상태와 개수를 돌려준다.
 * 게스트가 즐겨찾기를 늘리면 로그인 안내(바텀시트)를 띄울지 loginPrompt가 판단한다.
 */
export const toggleFavorite = async (item: NewFavorite): Promise<{ favorited: boolean; count: number }> => {
  const guest = await isGuest();
  const list = await getFavorites();
  const exists = list.some(f => f.menuName === item.menuName);

  if (guest) {
    const next = exists
      ? list.filter(f => f.menuName !== item.menuName)
      : [{ ...item, createdAt: new Date().toISOString() }, ...list];
    await writeList(GUEST_KEYS.favorites, next);
  } else if (exists) {
    await requestJson('/api/user/favorites', { method: 'DELETE', body: { menuName: item.menuName } });
  } else {
    await requestJson('/api/user/favorites', { method: 'POST', body: item });
  }

  const result = { favorited: !exists, count: list.length + (exists ? -1 : 1) };
  if (guest && result.favorited) notifyFavoriteSaved(result.count);
  return result;
};

// --- 기피 태그 ---

export const getAvoidTags = async (): Promise<string[]> => {
  if (await isGuest()) return parseAvoidTags(await AsyncStorage.getItem(GUEST_KEYS.avoidTags));
  const data = await requestJson('/api/user/avoid-tags');
  return parseAvoidTags(data.avoidTags);
};

export const setAvoidTags = async (tags: string[]): Promise<string[]> => {
  const clean = parseAvoidTags(tags);
  if (await isGuest()) {
    await AsyncStorage.setItem(GUEST_KEYS.avoidTags, clean.join(','));
    return clean;
  }
  const data = await requestJson('/api/user/avoid-tags', { method: 'PUT', body: { avoidTags: clean.join(',') } });
  return parseAvoidTags(data.avoidTags);
};

// --- 통계 ---

export const getStats = async (): Promise<UserStats> => {
  if (await isGuest()) {
    const [histories, favorites, avoidTags] = await Promise.all([getHistories(), getFavorites(), getAvoidTags()]);
    return { eatenCount: histories.length, favoritesCount: favorites.length, avoidCount: avoidTags.length };
  }
  return requestJson('/api/user/stats');
};

// --- 로그인 시 이관 (US-18) ---

export interface GuestImportResult {
  /** 옮길 것이 있었는지 */
  imported: boolean;
  histories: number;
  favorites: number;
  /** 서버에 저장된 합집합 기피 태그 (옮겼을 때만) */
  avoidTags?: string[];
}

/**
 * 로그인 직후(토큰 저장 후) 부른다. 기기에 남은 게스트 기록을 서버로 옮기고, 성공하면 기기 쪽을 비운다.
 * 실패하면 기기 기록을 그대로 두므로 다음 앱 실행 때 다시 시도된다. 서버는 같은 기록을 두 번 받아도 한 번만 저장한다.
 */
export const importGuestData = async (): Promise<GuestImportResult> => {
  const none = { imported: false, histories: 0, favorites: 0 };
  if (await isGuest()) return none;
  // 아직 쓰는 중인 게스트 기록이 있으면 끝난 뒤에 읽어야 옮기기·지우기에서 빠지지 않는다
  await guestHistoryQueue;

  const [histories, favorites, rawTags] = await Promise.all([
    readList<HistoryEntry>(GUEST_KEYS.histories),
    readList<FavoriteEntry>(GUEST_KEYS.favorites),
    AsyncStorage.getItem(GUEST_KEYS.avoidTags),
  ]);
  const avoidTags = parseAvoidTags(rawTags);
  if (!histories.length && !favorites.length && !avoidTags.length) return none;

  const data = await requestJson('/api/user/import', {
    method: 'POST',
    body: { histories, favorites, avoidTags },
    timeoutMs: 10000,
  });
  await AsyncStorage.multiRemove(Object.values(GUEST_KEYS));

  return {
    imported: true,
    histories: data.imported?.histories ?? 0,
    favorites: data.imported?.favorites ?? 0,
    avoidTags: parseAvoidTags(data.avoidTags),
  };
};

// --- 회원 탈퇴 ---

/**
 * 서버에서 계정과 기록을 모두 지우고, 이 기기에 남은 게스트 기록도 지운다.
 * 로그인 세션은 부른 쪽(AppNavigator의 로그아웃)이 지운다.
 */
export const deleteAccount = async (): Promise<void> => {
  if (await isGuest()) throw new Error('Not logged in');
  await requestJson('/api/user/account', { method: 'DELETE', timeoutMs: 10000 });
  await AsyncStorage.multiRemove(Object.values(GUEST_KEYS));
};
