jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: jest.fn(() => `uuid-0000-0000-${String(++n).padStart(4, '0')}`) };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../api/client', () => ({ apiFetch: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../api/client';
import { BATCH_SIZE, DEVICE_ID_KEY, __pendingCount, __resetAnalytics, flushEvents, getDeviceId, track } from '../events';

const mockFetch = apiFetch as jest.Mock;

beforeEach(async () => {
  __resetAnalytics();
  mockFetch.mockReset();
  await AsyncStorage.clear();
});

describe('analytics events (US-23)', () => {
  it('기기 ID는 한 번 만들어 저장하고 계속 쓴다', async () => {
    const first = await getDeviceId();
    __resetAnalytics();
    expect(await getDeviceId()).toBe(first);
    expect(await AsyncStorage.getItem(DEVICE_ID_KEY)).toBe(first);
  });

  it('모아서 기기 ID와 함께 한 번에 보낸다', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 201 });
    track('session-1234', { type: 'rec_start' });
    track('session-1234', { type: 'question_answer', payload: { questionId: 'soup', answer: 'yes', index: 0 } });
    await flushEvents();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [path, init] = mockFetch.mock.calls[0];
    expect(path).toBe('/api/events');
    expect(init.body.deviceId).toBe(await getDeviceId());
    expect(init.body.events.map((e: any) => e.type)).toEqual(['rec_start', 'question_answer']);
    expect(init.body.events[1]).toMatchObject({ sessionId: 'session-1234', payload: { questionId: 'soup', answer: 'yes' } });
    expect(__pendingCount()).toBe(0);
  });

  it('네트워크 오류면 남겨 두었다가 다음에 다시 보낸다', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, status: 201 });
    track('session-1234', { type: 'reject', payload: { menu: '짜장면', retries: 1 } });
    await flushEvents();
    expect(__pendingCount()).toBe(1);
    await flushEvents();
    expect(__pendingCount()).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('400(형식 오류)은 다시 보내지 않고 버린다', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400 });
    track('session-1234', { type: 'accept', payload: { action: 'eat', menu: '김밥' } });
    await flushEvents();
    expect(__pendingCount()).toBe(0);
  });

  it('50개씩 나눠 보낸다', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 201 });
    for (let i = 0; i < BATCH_SIZE + 5; i++) track('session-1234', { type: 'rec_start' });
    await flushEvents();
    expect(mockFetch.mock.calls.map(c => c[1].body.events.length)).toEqual([BATCH_SIZE, 5]);
  });

  it('세션 ID 없이는 기록하지 않는다', () => {
    track(null, { type: 'rec_start' });
    expect(__pendingCount()).toBe(0);
  });
});
