import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, apiFetch, saveSession, clearSession } from '../client';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('apiFetch', () => {
  const fetchMock = jest.fn(async () => ({ ok: true, status: 200 }) as Response);

  beforeEach(async () => {
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
    await AsyncStorage.clear();
  });

  it('서버 주소를 붙이고, 로그인돼 있으면 토큰 헤더와 JSON 본문을 붙인다', async () => {
    await saveSession('jwt-123', { id: 1 });
    await apiFetch('/api/user/favorites', { method: 'POST', body: { menuName: '짬뽕' } });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_BASE_URL}/api/user/favorites`);
    expect(init.headers).toEqual({ Authorization: 'Bearer jwt-123', 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ menuName: '짬뽕' }));
  });

  it('비로그인이면 Authorization 헤더를 보내지 않는다', async () => {
    await clearSession();
    await apiFetch('/api/restaurants/ranking');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toEqual({});
  });
});
