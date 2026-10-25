import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { apiFetch } from './client';

/**
 * 같이 정하기 방 API (서버: backend/src/routes/rooms.js).
 * 참가하면 받는 token으로 소켓에 들어가고, 앱을 껐다 켜도 이어서 하도록 기기에 저장해 둔다 (US-30).
 */

const SAVED_ROOM_KEY = 'group_room';

export interface RoomInfo {
  code: string;
  status: 'waiting' | 'playing' | 'finished' | 'expired';
  expiresAt: string;
  participantCount: number;
  maxParticipants: number;
}

export interface RoomMembership {
  code: string;
  token: string;
  participantId: number;
  nickname: string;
}

export class RoomApiError extends Error {
  constructor(message: string, public reason?: string, public status?: number) {
    super(message);
  }
}

const readJson = async (res: Response) => {
  try {
    return await res.json();
  } catch (e) {
    return {};
  }
};

const enter = async (path: string, nickname: string, avoidTags: string[]): Promise<{ room: RoomInfo; membership: RoomMembership }> => {
  const res = await apiFetch(path, { method: 'POST', body: { nickname, avoidTags }, timeoutMs: 8000 });
  const data = await readJson(res);
  if (!res.ok) throw new RoomApiError(data.error || '잠시 후 다시 시도해 주세요.', data.reason, res.status);
  const membership: RoomMembership = {
    code: data.room.code,
    token: data.participant.token,
    participantId: data.participant.id,
    nickname: data.participant.nickname,
  };
  await saveMembership(membership);
  return { room: data.room, membership };
};

export const createRoom = (nickname: string, avoidTags: string[]) => enter('/api/rooms', nickname, avoidTags);

export const joinRoom = (code: string, nickname: string, avoidTags: string[]) =>
  enter(`/api/rooms/${encodeURIComponent(normalizeRoomCode(code))}/join`, nickname, avoidTags);

/** 초대 링크로 들어왔을 때 방이 살아 있는지 먼저 본다 */
export const getRoom = async (code: string): Promise<RoomInfo> => {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(normalizeRoomCode(code))}`, { auth: false, timeoutMs: 8000 });
  const data = await readJson(res);
  if (!res.ok) throw new RoomApiError(data.error || '방을 찾을 수 없어요.', data.reason, res.status);
  return data.room;
};

// --- 참가 정보 저장 ---

export const saveMembership = (m: RoomMembership) => AsyncStorage.setItem(SAVED_ROOM_KEY, JSON.stringify(m));

export const loadMembership = async (): Promise<RoomMembership | null> => {
  const raw = await AsyncStorage.getItem(SAVED_ROOM_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearMembership = () => AsyncStorage.removeItem(SAVED_ROOM_KEY);

// --- 방 코드와 초대 링크 ---

export const ROOM_CODE_LENGTH = 4;

export const normalizeRoomCode = (code: string) => code.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, ROOM_CODE_LENGTH);

/** 빌드한 앱에서는 mechuri://room/CODE, Expo Go에서는 exp://…/--/room/CODE */
export const roomInviteUrl = (code: string) => Linking.createURL(`room/${code}`);

/** 초대 링크에서 방 코드를 꺼낸다. 방 링크가 아니면 null */
export const parseRoomCodeFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/(?:^|[/:])room\/([0-9a-z]{4})(?![0-9a-z])/i);
  return match ? match[1].toUpperCase() : null;
};

export const inviteMessage = (code: string) =>
  `메추리에서 오늘 뭐 먹을지 같이 정하자! 🐦\n방 코드: ${code}\n${roomInviteUrl(code)}`;
