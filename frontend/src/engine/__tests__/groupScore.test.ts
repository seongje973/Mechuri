import { MENU_DATA, MenuItem, getAvoidTags } from '../../constants/menuData';
import { QUESTIONS } from '../../constants/akinatorQuestions';
import { applyScoreAnswer, createScoreSession } from '../scoreEngine';
import { GROUP_NO_PENALTY, GROUP_VOTE_GAP, GroupMember, groupReasons, scoreGroup } from '../groupScore';
import { ScoreAnswer } from '../config';

const byName = (name: string) => MENU_DATA.find(m => m.name === name) as MenuItem;
const q = (id: string) => QUESTIONS.find(x => x.id === id)!;

const member = (participantId: number, answers: [string, ScoreAnswer][], avoidTags: string[] = []): GroupMember => ({
  participantId,
  nickname: `p${participantId}`,
  avoidTags,
  answers: answers.map(([questionId, answer]) => ({ questionId, answer })),
});

describe('그룹 점수', () => {
  it('각자 점수를 더한다 (아무도 "아니"를 안 하면 감점 없음)', () => {
    const pool = [byName('짜장면'), byName('김치찌개')];
    const result = scoreGroup([member(1, [['base-noodle', 'yes']]), member(2, [['base-noodle', 'probably']])], pool);
    const solo = (answer: ScoreAnswer) => applyScoreAnswer(createScoreSession(pool), q('base-noodle'), answer).scores;
    const score = (name: string) => result.ranked.find(r => r.item.name === name)!.score;
    expect(score('짜장면')).toBe(solo('yes')['짜장면'] + solo('probably')['짜장면']);
    expect(score('김치찌개')).toBe(solo('yes')['김치찌개'] + solo('probably')['김치찌개']);
  });

  it('한 명이 매운맛 기피면 매운 메뉴가 결과에 없다', () => {
    const result = scoreGroup([
      member(1, [['spicy', 'yes'], ['cuisine-korean', 'yes']]),
      member(2, [['spicy', 'yes']], ['매운맛']),
      member(3, [['spicy', 'yes']]),
    ]);
    expect(result.ranked.length).toBeGreaterThan(0);
    expect(result.ranked.every(r => !getAvoidTags(r.item).includes('매운맛'))).toBe(true);
    expect(result.avoidTags).toEqual(['매운맛']);
  });

  it('한 명이라도 "아니" 한 속성의 메뉴는 크게 깎인다', () => {
    const pool = [byName('짜장면'), byName('김치찌개')];
    // 한 명은 면이 좋고 한 명은 싫다 → 합만 보면 짜장면 0 : 김치찌개 -1 이지만 감점으로 짜장면이 밀린다
    const result = scoreGroup([
      member(1, [['base-noodle', 'yes']]),
      member(2, [['base-noodle', 'no']]),
    ], pool);
    const noodle = result.ranked.find(r => r.item.name === '짜장면')!;
    expect(noodle.score).toBe(2 - 2 + GROUP_NO_PENALTY);
    expect(noodle.contributions.filter(c => c.penalty)).toHaveLength(1);
    expect(result.ranked[0].item.name).toBe('김치찌개');
  });

  it('여러 명이 같은 질문에 "아니"해도 감점은 한 번', () => {
    const pool = [byName('짜장면'), byName('김치찌개')];
    const result = scoreGroup([member(1, [['base-noodle', 'no']]), member(2, [['base-noodle', 'no']])], pool);
    expect(result.ranked.find(r => r.item.name === '짜장면')!.score).toBe(-2 - 2 + GROUP_NO_PENALTY);
  });

  it('나간 사람의 답과 기피 태그는 세지 않는다', () => {
    const left = { ...member(2, [['base-noodle', 'no']], ['밀가루']), left: true };
    const result = scoreGroup([member(1, [['base-noodle', 'yes']]), left]);
    expect(result.avoidTags).toEqual([]);
    expect(result.ranked.some(r => r.item.name === '짜장면')).toBe(true);
    expect(result.ranked.find(r => r.item.name === '짜장면')!.contributions.some(c => c.penalty)).toBe(false);
  });

  it('같은 답이면 순서가 달라도 같은 결과 (모든 폰이 같은 메뉴)', () => {
    const a = member(1, [['soup', 'yes'], ['cuisine-korean', 'probably']]);
    const b = member(2, [['soup', 'probably'], ['spicy', 'no']]);
    expect(scoreGroup([a, b]).ranked.map(r => r.item.name)).toEqual(scoreGroup([b, a]).ranked.map(r => r.item.name));
  });

  it('1·2위 차이가 작으면 상위 4개로 투표한다', () => {
    const close = scoreGroup([member(1, [['soup', 'dontcare']]), member(2, [])]);
    expect(close.ranked[0].score - close.ranked[1].score).toBeLessThan(GROUP_VOTE_GAP);
    expect(close.needsVote).toBe(true);
    expect(close.voteCandidates).toEqual(close.ranked.slice(0, 4).map(r => r.item.name));

    const pool = [byName('짜장면'), byName('김치찌개')];
    const clear = scoreGroup([member(1, [['base-noodle', 'yes']]), member(2, [['base-noodle', 'yes']])], pool);
    expect(clear.needsVote).toBe(false);
    expect(clear.voteCandidates).toEqual([]);
  });

  it('추천 이유는 점수를 올린 질문의 문구로, 보탠 사람 수와 함께', () => {
    const pool = [byName('짜장면'), byName('김치찌개')];
    const result = scoreGroup([
      member(1, [['base-noodle', 'yes'], ['soup', 'no']]),
      member(2, [['base-noodle', 'yes'], ['soup', 'dontcare']]),
    ], pool);
    const top = result.ranked[0];
    expect(top.item.name).toBe('짜장면');
    expect(groupReasons(top)).toEqual([
      { label: '면', members: 2 },
      { label: '국물 X', members: 1 },
    ]);
  });
});
