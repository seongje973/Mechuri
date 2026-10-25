import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './client';
import { ScoreAnswer } from '../engine/config';
import { AnswerRecord } from '../engine/scoreEngine';

/**
 * 같이 정하기 실시간 연결 (서버: backend/src/realtime). 방 상태는 서버가 정하고,
 * 앱은 room:state를 그대로 보여준다. 연결이 끊겼다 다시 붙으면 같은 token으로 다시 join해서
 * 하던 질문으로 돌아간다 (US-30).
 */

export interface RoomParticipant {
  id: number;
  nickname: string;
  ready: boolean;
  connected: boolean;
  away: boolean;
}

export interface RoomQuestion {
  index: number;
  total: number;
  questionId: string;
  deadline: number;
  answeredIds: number[];
}

export interface RoomMemberAnswers {
  participantId: number;
  nickname: string;
  left: boolean;
  avoidTags: string[];
  answers: AnswerRecord[];
}

export interface RoomVote {
  candidates: string[];
  deadline: number | null;
  votedIds: number[];
  winner: string | null;
  tally: Record<string, number> | null;
}

export interface RoomState {
  code: string;
  status: 'waiting' | 'playing' | 'finished' | 'expired';
  expiresAt: string;
  hostId: number | null;
  participants: RoomParticipant[];
  question: RoomQuestion | null;
  result: { questionIds: string[]; answers: RoomMemberAnswers[] } | null;
  vote: RoomVote | null;
}

export type Ack = { ok: true; [key: string]: any } | { ok: false; error: string; message: string };

/** 다시 붙어도 소용없는 오류. 저장한 참가 정보를 지우고 처음 화면으로 */
export const FATAL_ROOM_ERRORS = ['INVALID_TOKEN', 'ROOM_EXPIRED', 'NOT_IN_ROOM'];

const ACK_TIMEOUT_MS = 8000;
const JOIN_RETRY_MS = 2000;

export const applyRoomEvent = (state: RoomState | null, event: string, payload: any): RoomState | null => {
  if (event === 'room:state') return payload;
  if (!state) return state;
  switch (event) {
    case 'question':
      return { ...state, status: 'playing', question: payload };
    case 'answered':
      return state.question && state.question.questionId === payload.questionId
        ? { ...state, question: { ...state.question, answeredIds: payload.answeredIds } }
        : state;
    case 'host:changed':
      return { ...state, hostId: payload.hostId };
    case 'room:finished':
      return { ...state, status: 'finished', question: null, result: payload };
    case 'vote:started':
    case 'vote:result':
      return { ...state, vote: payload };
    case 'vote:cast':
      return state.vote ? { ...state, vote: { ...state.vote, votedIds: payload.votedIds } } : state;
    default:
      return state;
  }
};

const ROOM_EVENTS = ['room:state', 'question', 'answered', 'host:changed', 'room:finished', 'vote:started', 'vote:cast', 'vote:result'];

export interface RoomConnection {
  state: RoomState | null;
  participantId: number | null;
  connected: boolean;
  /** 방이 만료됐거나 참가 정보가 더 이상 맞지 않음 */
  fatal: { error: string; message: string } | null;
  setReady: (ready: boolean) => Promise<Ack>;
  start: () => Promise<Ack>;
  answer: (questionId: string, answer: ScoreAnswer) => Promise<Ack>;
  next: () => Promise<Ack>;
  leave: () => Promise<Ack>;
  openVote: (candidates: string[]) => Promise<Ack>;
  vote: (menu: string) => Promise<Ack>;
}

export const useRoomConnection = (token: string | null, createSocket: (url: string) => Socket = defaultSocket): RoomConnection => {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [fatal, setFatal] = useState<RoomConnection['fatal']>(null);

  useEffect(() => {
    setState(null);
    setFatal(null);
    setParticipantId(null);
    if (!token) return;

    const socket = createSocket(API_BASE_URL);
    socketRef.current = socket;

    // 연결은 살아 있는데 join 응답이 없거나 일시적인 오류면 잠시 뒤 다시 join
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const retryJoin = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { if (socket.connected) join(); }, JOIN_RETRY_MS);
    };

    const join = () => {
      socket.timeout(ACK_TIMEOUT_MS).emit('join', { token }, (err: Error | null, ack: Ack) => {
        if (err) return retryJoin();
        if (ack.ok) {
          setParticipantId(ack.participantId);
          setState(ack.state);
        } else if (FATAL_ROOM_ERRORS.includes(ack.error)) {
          setFatal({ error: ack.error, message: ack.message });
          socket.disconnect();
        } else {
          retryJoin();
        }
      });
    };

    socket.on('connect', () => {
      setConnected(true);
      join();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:expired', (payload: { message: string }) => {
      setFatal({ error: 'ROOM_EXPIRED', message: payload.message });
      socket.disconnect();
    });
    ROOM_EVENTS.forEach(event => {
      socket.on(event, (payload: any) => setState(prev => applyRoomEvent(prev, event, payload)));
    });

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setConnected(false);
    };
  }, [token, createSocket]);

  const call = useCallback((event: string, payload: object = {}) => new Promise<Ack>(resolve => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      resolve({ ok: false, error: 'OFFLINE', message: '연결이 끊겼어요. 다시 연결하는 중이에요.' });
      return;
    }
    socket.timeout(ACK_TIMEOUT_MS).emit(event, payload, (err: Error | null, ack: Ack) => {
      resolve(err ? { ok: false, error: 'TIMEOUT', message: '응답이 없어요. 다시 눌러 주세요.' } : ack);
    });
  }), []);

  return {
    state,
    participantId,
    connected,
    fatal,
    setReady: ready => call('ready', { ready }),
    start: () => call('start'),
    answer: (questionId, answer) => call('answer', { questionId, answer }),
    next: () => call('next'),
    leave: () => call('leave'),
    openVote: candidates => call('vote:open', { candidates }),
    vote: menu => call('vote', { menu }),
  };
};

function defaultSocket(url: string) {
  // React Native에서는 long-polling보다 websocket이 안정적이다
  return io(url, { transports: ['websocket'], reconnectionDelayMax: 5000 });
}
