import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { apiFetch } from '../api/client';

/**
 * 지표용 이벤트 전송 (US-23). 서버: POST /api/events (backend/src/routes/events.js)
 * - 기기 ID는 설치마다 하나, 추천 세션 ID는 추천 한 판마다 하나
 * - 이벤트는 모아서 보낸다. 실패하면 다음 전송 때 다시 보낸다
 * - 어떤 경우에도 화면 쪽으로 오류를 던지지 않는다 (지표 때문에 추천이 멈추면 안 된다)
 */

export type AcceptAction = 'restaurant' | 'delivery' | 'eat' | 'favorite';

export type AppEvent =
  | { type: 'rec_start'; payload?: { autoStart?: boolean; excluded?: string[] } }
  | { type: 'question_answer'; payload: { questionId: string; answer: 'yes' | 'probably' | 'dontcare' | 'no'; index: number } }
  | { type: 'result_shown'; payload: { menu: string; alternatives: string[]; questions: number; retries: number; via?: 'worldcup' } }
  | { type: 'accept'; payload: { action: AcceptAction; menu: string } }
  | { type: 'reject'; payload: { menu: string; retries: number } };

interface QueuedEvent {
  /** 재전송해도 서버가 한 번만 저장하도록 이벤트마다 붙이는 ID */
  eventId: string;
  type: AppEvent['type'];
  payload: Record<string, unknown>;
  sessionId: string;
  occurredAt: string;
}

export const DEVICE_ID_KEY = 'analytics_device_id';
/** 서버 한 번에 최대 50개 */
export const BATCH_SIZE = 50;
/** 오래 못 보내도 이 이상은 쌓지 않는다 (오래된 것부터 버림) */
export const MAX_QUEUE = 200;
export const FLUSH_DELAY_MS = 2000;

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> | null = null;
let deviceIdPromise: Promise<string> | null = null;

export const newSessionId = (): string => Crypto.randomUUID();

export const getDeviceId = (): Promise<string> => {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (saved && ID_PATTERN.test(saved)) return saved;
        const created = Crypto.randomUUID();
        await AsyncStorage.setItem(DEVICE_ID_KEY, created);
        return created;
      } catch {
        return Crypto.randomUUID();
      }
    })();
  }
  return deviceIdPromise;
};

/** 이벤트를 큐에 넣고 잠시 뒤 보낸다. sessionId가 없으면 (추천 시작 전) 버린다 */
export const track = (sessionId: string | null, event: AppEvent): void => {
  if (!sessionId) return;
  queue.push({ eventId: Crypto.randomUUID(), type: event.type, payload: (event.payload ?? {}) as Record<string, unknown>, sessionId, occurredAt: new Date().toISOString() });
  if (queue.length > MAX_QUEUE) queue = queue.slice(queue.length - MAX_QUEUE);

  if (queue.length >= BATCH_SIZE) {
    void flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushEvents();
    }, FLUSH_DELAY_MS);
  }
};

/** 지금 쌓인 이벤트를 보낸다. 동시에 여러 번 불러도 한 번씩만 보낸다 */
export const flushEvents = (): Promise<void> => {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      const deviceId = await getDeviceId();
      while (queue.length > 0) {
        const batch = queue.slice(0, BATCH_SIZE);
        let ok = false;
        try {
          const res = await apiFetch('/api/events', { method: 'POST', body: { deviceId, events: batch }, timeoutMs: 5000 });
          ok = res.ok;
          // 400은 다시 보내도 같은 결과라 버린다
          if (!ok && res.status === 400) {
            queue = queue.filter(e => !batch.includes(e));
            continue;
          }
        } catch {
          ok = false;
        }
        if (!ok) return; // 네트워크·서버 오류: 남겨 두고 다음 기회에
        // 보내는 사이 track()이 앞쪽을 잘라냈을 수 있어 위치가 아닌 객체로 지운다
        queue = queue.filter(e => !batch.includes(e));
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
};

// 앱이 백그라운드로 가면 남은 이벤트를 바로 보낸다
AppState.addEventListener?.('change', state => {
  if (state !== 'active') void flushEvents();
});

/** 테스트용 */
export const __resetAnalytics = () => {
  queue = [];
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  flushing = null;
  deviceIdPromise = null;
};
export const __pendingCount = () => queue.length;
