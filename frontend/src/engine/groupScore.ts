import { MENU_DATA, MenuItem } from '../constants/menuData';
import { QUESTIONS, Question, matchesQuestion } from '../constants/akinatorQuestions';
import { AnswerRecord, RankedMenu, ScoreContribution, ScoreSession, applyScoreAnswer, createScoreSession, rankCandidates } from './scoreEngine';

/**
 * 같이 정하기 그룹 점수 (US-27).
 * 각자의 답을 점수 엔진에 그대로 넣고 점수를 더한다. 그 위에 두 가지를 더한다.
 * - 한 명이라도 기피 태그에 걸리는 메뉴는 후보에서 뺀다 (모두의 기피 태그 합집합).
 * - 한 명이라도 "아니" 한 속성의 메뉴는 GROUP_NO_PENALTY만큼 더 깎는다. 누가 싫다고 한 메뉴는 웬만하면 안 나오게.
 * 같은 답과 같은 메뉴 데이터면 모든 폰에서 같은 결과가 나온다 (동점이면 메뉴 데이터 순서).
 */

/** 한 명이라도 "아니"라고 한 질문에 맞는 메뉴에 질문마다 한 번 더하는 점수 */
export const GROUP_NO_PENALTY = -4;
/** 1·2위 점수 차이가 이보다 작으면 투표로 정한다 (US-28) */
export const GROUP_VOTE_GAP = 2;
/** 투표에 올리는 상위 메뉴 수 */
export const GROUP_VOTE_SIZE = 4;

export interface GroupMember {
  participantId: number;
  nickname: string;
  avoidTags: string[];
  answers: AnswerRecord[];
  /** 진행 중에 나간 사람. 점수와 기피 태그에서 뺀다 */
  left?: boolean;
}

export interface GroupContribution extends ScoreContribution {
  /** 이 근거를 만든 사람. 감점은 null */
  participantId: number | null;
  /** 한 명이라도 "아니"라서 붙은 감점인지 */
  penalty?: boolean;
}

export interface GroupRankedMenu extends RankedMenu {
  contributions: GroupContribution[];
}

export interface GroupResult {
  ranked: GroupRankedMenu[];
  /** 모두의 기피 태그 (중복 없이) */
  avoidTags: string[];
  /** 1·2위가 비슷해서 투표가 필요한지 */
  needsVote: boolean;
  /** 투표에 올릴 메뉴 이름. 투표가 필요 없으면 빈 배열 */
  voteCandidates: string[];
}

const findQuestion = (questions: Question[], id: string) => questions.find(q => q.id === id);

export const scoreGroup = (members: GroupMember[], menus: MenuItem[] = MENU_DATA, questions: Question[] = QUESTIONS): GroupResult => {
  const active = members.filter(m => !m.left);
  const avoidTags = [...new Set(active.flatMap(m => m.avoidTags))];
  const start = createScoreSession(menus, { avoidTags });

  const scores: Record<string, number> = { ...start.scores };
  const contributions: Record<string, GroupContribution[]> = {};
  start.candidates.forEach(item => { contributions[item.name] = []; });

  // 각자 따로 점수를 매긴 뒤 더한다
  active.forEach(member => {
    let session: ScoreSession = start;
    member.answers.forEach(({ questionId, answer }) => {
      const question = findQuestion(questions, questionId);
      if (question) session = applyScoreAnswer(session, question, answer);
    });
    start.candidates.forEach(item => {
      scores[item.name] += session.scores[item.name];
      session.contributions[item.name].forEach(c => {
        contributions[item.name].push({ ...c, participantId: member.participantId });
      });
    });
  });

  // 한 명이라도 "아니" 한 질문
  const vetoed = new Set(active.flatMap(m => m.answers.filter(a => a.answer === 'no').map(a => a.questionId)));
  vetoed.forEach(questionId => {
    const question = findQuestion(questions, questionId);
    if (!question) return;
    start.candidates.forEach(item => {
      if (!matchesQuestion(item, question)) return;
      scores[item.name] += GROUP_NO_PENALTY;
      contributions[item.name].push({ questionId, answer: 'no', matched: true, delta: GROUP_NO_PENALTY, participantId: null, penalty: true });
    });
  });

  const ranked = rankCandidates({ ...start, scores, contributions }) as GroupRankedMenu[];
  const needsVote = ranked.length >= 2 && ranked[0].score - ranked[1].score < GROUP_VOTE_GAP;
  return {
    ranked,
    avoidTags,
    needsVote,
    voteCandidates: needsVote ? ranked.slice(0, GROUP_VOTE_SIZE).map(r => r.item.name) : [],
  };
};

export interface GroupReason {
  label: string;
  /** 이 이유에 점수를 보탠 사람 수 */
  members: number;
}

/**
 * 결과 화면의 "이래서 골랐어" 칩. 메뉴 점수를 올린 질문을 많이 올린 순서로.
 * 맞는 속성이면 reason.yes ("국물 O"), 안 맞는 속성을 원했으면 reason.no ("국물 X").
 */
export const groupReasons = (menu: GroupRankedMenu, questions: Question[] = QUESTIONS, limit = 3): GroupReason[] => {
  const byQuestion = new Map<string, { delta: number; matched: boolean; members: Set<number> }>();
  menu.contributions.forEach(c => {
    if (c.penalty || c.participantId == null) return;
    const entry = byQuestion.get(c.questionId) ?? { delta: 0, matched: c.matched, members: new Set<number>() };
    entry.delta += c.delta;
    if (c.delta > 0) entry.members.add(c.participantId);
    byQuestion.set(c.questionId, entry);
  });

  return [...byQuestion.entries()]
    .filter(([, e]) => e.delta > 0)
    .sort((a, b) => b[1].delta - a[1].delta)
    .slice(0, limit)
    .flatMap(([questionId, e]) => {
      const question = findQuestion(questions, questionId);
      return question ? [{ label: e.matched ? question.reason.yes : question.reason.no, members: e.members.size }] : [];
    });
};
