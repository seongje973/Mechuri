import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSession } from '../../api/client';
import {
  GUEST_KEYS,
  addHistory,
  deleteAccount,
  getAvoidTags,
  getFavorites,
  getHistories,
  getPreferences,
  getStats,
  importGuestData,
  setAvoidTags,
  setPreferences,
  toggleFavorite,
} from '../userData';
import { onLoginPrompt, snoozeLoginPrompt } from '../loginPrompt';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('게스트 저장소', () => {
  const fetchMock = jest.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    await AsyncStorage.clear();
  });

  it('토큰이 없으면 서버를 부르지 않고 기기에 기록·즐겨찾기·기피 태그를 저장한다', async () => {
    await addHistory({ menuName: '김치찌개', emoji: '🍲', category: '한식' });
    await addHistory({ menuName: '초밥', emoji: '🍣', category: '일식' });
    expect((await getHistories()).map(h => h.menuName)).toEqual(['초밥', '김치찌개']);

    await expect(toggleFavorite({ menuName: '초밥' })).resolves.toEqual({ favorited: true, count: 1 });
    await expect(toggleFavorite({ menuName: '초밥' })).resolves.toEqual({ favorited: false, count: 0 });
    await toggleFavorite({ menuName: '짬뽕' });
    expect((await getFavorites()).map(f => f.menuName)).toEqual(['짬뽕']);

    await setAvoidTags(['오이', '오이', ' 가지 ']);
    expect(await getAvoidTags()).toEqual(['오이', '가지']);

    await expect(getStats()).resolves.toEqual({ eatenCount: 2, favoritesCount: 1, avoidCount: 2 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('게스트 기록을 동시에 저장해도 둘 다 남는다', async () => {
    await Promise.all([
      addHistory({ menuName: '김치찌개' }),
      addHistory({ menuName: '초밥' }),
    ]);
    expect((await getHistories()).map(h => h.menuName).sort()).toEqual(['김치찌개', '초밥']);
  });

  it('즐겨찾기 3개째에서 한 번만 로그인 시트를 요청하고, 7일 안에 닫았으면 요청하지 않는다', async () => {
    const listener = jest.fn();
    const unsubscribe = onLoginPrompt(listener);

    for (const menuName of ['a', 'b', 'c', 'd']) await toggleFavorite({ menuName });
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('favorite');

    await AsyncStorage.removeItem(GUEST_KEYS.favorites);
    await snoozeLoginPrompt();
    for (const menuName of ['a', 'b', 'c']) await toggleFavorite({ menuName });
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('로그인하면 서버를 쓰고, 기기 기록을 /api/user/import로 옮긴 뒤 비운다', async () => {
    await addHistory({ menuName: '김치찌개' });
    await toggleFavorite({ menuName: '초밥', emoji: '🍣' });
    await setAvoidTags(['오이']);

    await saveSession('jwt-1', { id: 1 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ imported: { histories: 1, favorites: 1 }, avoidTags: '매운맛,오이' }),
    });

    await expect(importGuestData()).resolves.toEqual({
      imported: true,
      histories: 1,
      favorites: 1,
      avoidTags: ['매운맛', '오이'],
      preferences: null,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/user\/import$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    const body = JSON.parse(init.body);
    expect(body.histories.map((h: any) => h.menuName)).toEqual(['김치찌개']);
    expect(body.favorites.map((f: any) => f.menuName)).toEqual(['초밥']);
    expect(body.avoidTags).toEqual(['오이']);
    expect(body.preferences).toBeNull();

    for (const key of Object.values(GUEST_KEYS)) expect(await AsyncStorage.getItem(key)).toBeNull();

    // 옮길 것이 없으면 다시 부르지 않는다
    await expect(importGuestData()).resolves.toMatchObject({ imported: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('게스트 취향은 기기에 저장하고, 한 번도 설정하지 않았으면 null', async () => {
    expect(await getPreferences()).toBeNull();
    await setPreferences({ likedCuisines: ['일식', '한식'], spicy: 'hot' });
    expect(await getPreferences()).toEqual({ likedCuisines: ['한식', '일식'], spicy: 'hot' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('게스트 취향만 있어도 로그인하면 옮기고, 서버가 돌려준 계정 취향을 쓴다', async () => {
    await setPreferences({ likedCuisines: ['중식'], spicy: 'mild' });
    await saveSession('jwt-1', { id: 1 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        imported: { histories: 0, favorites: 0 },
        avoidTags: '',
        preferences: { likedCuisines: ['양식'], spicy: null },
      }),
    });

    await expect(importGuestData()).resolves.toMatchObject({
      imported: true,
      preferences: { likedCuisines: ['양식'], spicy: null },
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).preferences).toEqual({ likedCuisines: ['중식'], spicy: 'mild' });
    expect(await AsyncStorage.getItem(GUEST_KEYS.preferences)).toBeNull();
  });

  it('로그인 상태의 취향은 서버 /api/user/preferences를 쓴다', async () => {
    await saveSession('jwt-1', { id: 1 });
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ preferences: null }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ preferences: { likedCuisines: ['분식'], spicy: 'normal' } }),
      });

    expect(await getPreferences()).toBeNull();
    await expect(setPreferences({ likedCuisines: ['분식'], spicy: 'normal' })).resolves.toEqual({
      likedCuisines: ['분식'],
      spicy: 'normal',
    });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/api\/user\/preferences$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ preferences: { likedCuisines: ['분식'], spicy: 'normal' } });
  });

  it('저장 중이던 게스트 기록도 이관에 포함한다', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ imported: { histories: 1, favorites: 0 }, avoidTags: '' }),
    });
    // 게스트 기록 쓰기를 붙잡아 두고, 그사이 로그인해 이관을 시작한다
    let release = () => {};
    const gate = new Promise<void>(resolve => (release = resolve));
    const setItem = AsyncStorage.setItem as jest.Mock;
    const realSetItem = setItem.getMockImplementation()!;
    setItem.mockImplementationOnce(async (key: string, value: string) => {
      await gate;
      return realSetItem(key, value);
    });
    const pending = addHistory({ menuName: '김치찌개' });
    await flush();
    await saveSession('jwt-1', { id: 1 });
    const importing = importGuestData();
    await flush();
    release();
    await Promise.all([pending, importing]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.histories.map((h: any) => h.menuName)).toEqual(['김치찌개']);
  });

  it('저장 중이던 게스트 즐겨찾기도 이관에 포함한다', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ imported: { histories: 0, favorites: 1 }, avoidTags: '' }),
    });
    let release = () => {};
    const gate = new Promise<void>(resolve => (release = resolve));
    const setItem = AsyncStorage.setItem as jest.Mock;
    const realSetItem = setItem.getMockImplementation()!;
    setItem.mockImplementationOnce(async (key: string, value: string) => {
      await gate;
      return realSetItem(key, value);
    });
    const pending = toggleFavorite({ menuName: '초밥' });
    await flush();
    await saveSession('jwt-1', { id: 1 });
    const importing = importGuestData();
    await flush();
    release();
    await Promise.all([pending, importing]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.favorites.map((f: any) => f.menuName)).toEqual(['초밥']);
    expect(await AsyncStorage.getItem(GUEST_KEYS.favorites)).toBeNull();
  });

  it('기기 즐겨찾기를 읽지 못하면 덮어쓰지 않는다', async () => {
    await AsyncStorage.setItem(GUEST_KEYS.favorites, '{깨진 JSON');
    await expect(toggleFavorite({ menuName: '초밥' })).rejects.toThrow();
    expect(await AsyncStorage.getItem(GUEST_KEYS.favorites)).toBe('{깨진 JSON');
  });

  it('기기 즐겨찾기를 읽지 못하면 이관하지 않고 기기 기록을 남긴다', async () => {
    await addHistory({ menuName: '김치찌개' });
    await AsyncStorage.setItem(GUEST_KEYS.favorites, '{깨진 JSON');
    await saveSession('jwt-1', { id: 1 });
    await expect(importGuestData()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(GUEST_KEYS.histories)).not.toBeNull();
    expect(await AsyncStorage.getItem(GUEST_KEYS.favorites)).toBe('{깨진 JSON');
  });

  it('기기 즐겨찾기가 목록이 아니면 이관하지 않고 기기 기록을 남긴다', async () => {
    await addHistory({ menuName: '김치찌개' });
    await AsyncStorage.setItem(GUEST_KEYS.favorites, '{"menuName":"초밥"}');
    await saveSession('jwt-1', { id: 1 });
    await expect(importGuestData()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(GUEST_KEYS.favorites)).toBe('{"menuName":"초밥"}');
  });

  it('로그인 상태의 저장 요청이 늦어져도 이관은 기다리지 않는다', async () => {
    await addHistory({ menuName: '김치찌개' });
    await saveSession('jwt-1', { id: 1 });
    fetchMock
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ imported: { histories: 1, favorites: 0 } }) });

    void addHistory({ menuName: '초밥' });
    await flush();
    await expect(importGuestData()).resolves.toMatchObject({ imported: true, histories: 1 });
    expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
  });

  it('이관이 실패하면 기기 기록을 남겨 다음에 다시 시도할 수 있다', async () => {
    await addHistory({ menuName: '김치찌개' });
    await saveSession('jwt-1', { id: 1 });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(importGuestData()).rejects.toThrow();
    expect(await AsyncStorage.getItem(GUEST_KEYS.histories)).not.toBeNull();
  });

  it('로그인 상태의 즐겨찾기 토글은 서버의 POST/DELETE를 쓴다', async () => {
    await saveSession('jwt-1', { id: 1 });
    const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
    fetchMock
      .mockResolvedValueOnce(json({ favorites: [{ menuName: '초밥', createdAt: '2026-10-25T00:00:00.000Z' }] }))
      .mockResolvedValueOnce(json({}));

    await expect(toggleFavorite({ menuName: '초밥' })).resolves.toEqual({ favorited: false, count: 0 });
    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body)).toEqual({ menuName: '초밥' });
  });
});

describe('회원 탈퇴', () => {
  const fetchMock = jest.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    await AsyncStorage.clear();
  });

  it('게스트는 탈퇴할 계정이 없다', async () => {
    await expect(deleteAccount()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('서버의 DELETE /api/user/account를 부르고 기기 기록도 지운다', async () => {
    await AsyncStorage.setItem(GUEST_KEYS.histories, '[]');
    await saveSession('jwt-1', { id: 1 });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await deleteAccount();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/user\/account$/);
    expect(init.method).toBe('DELETE');
    expect(await AsyncStorage.getItem(GUEST_KEYS.histories)).toBeNull();
  });
});
