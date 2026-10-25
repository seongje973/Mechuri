import { normalizeRoomCode, parseRoomCodeFromUrl } from '../rooms';
import { applyRoomEvent, RoomState } from '../roomSocket';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `mechuri://${path}` }));
jest.mock('../client', () => ({ apiFetch: jest.fn(), API_BASE_URL: 'http://test' }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));

describe('초대 링크', () => {
  it('앱 링크와 Expo Go 링크 모두에서 방 코드를 꺼낸다', () => {
    expect(parseRoomCodeFromUrl('mechuri://room/abcd')).toBe('ABCD');
    expect(parseRoomCodeFromUrl('exp://192.168.0.2:8081/--/room/K7MP')).toBe('K7MP');
    expect(parseRoomCodeFromUrl('mechuri://auth?code=abc')).toBeNull();
    expect(parseRoomCodeFromUrl('mechuri://room/ABCDE')).toBeNull();
    expect(parseRoomCodeFromUrl(null)).toBeNull();
  });

  it('입력한 코드는 대문자 4자리로 맞춘다', () => {
    expect(normalizeRoomCode(' ab-c d9 ')).toBe('ABCD');
  });
});

describe('방 이벤트 반영', () => {
  const base: RoomState = {
    code: 'ABCD', status: 'playing', expiresAt: '', hostId: 1,
    participants: [], result: null, vote: null,
    question: { index: 0, total: 7, questionId: 'soup', deadline: 0, answeredIds: [] },
  };

  it('같은 질문의 답한 사람만 바꾼다', () => {
    expect(applyRoomEvent(base, 'answered', { questionId: 'soup', answeredIds: [1] })!.question!.answeredIds).toEqual([1]);
    expect(applyRoomEvent(base, 'answered', { questionId: 'cold', answeredIds: [1] })).toBe(base);
  });

  it('투표 시작, 표, 결과를 반영한다', () => {
    const vote = { candidates: ['a', 'b'], deadline: 1, votedIds: [], winner: null, tally: null };
    const started = applyRoomEvent(base, 'vote:started', vote)!;
    expect(applyRoomEvent(started, 'vote:cast', { votedIds: [2] })!.vote!.votedIds).toEqual([2]);
    expect(applyRoomEvent(started, 'vote:result', { ...vote, winner: 'b' })!.vote!.winner).toBe('b');
  });

  it('room:state는 통째로 바꾸고, 상태가 없을 때 다른 이벤트는 무시한다', () => {
    expect(applyRoomEvent(null, 'room:state', base)).toBe(base);
    expect(applyRoomEvent(null, 'question', base.question)).toBeNull();
  });
});
