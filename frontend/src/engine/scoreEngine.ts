import { MenuItem, getAvoidTags } from '../constants/menuData';
import { Question, matchesQuestion } from '../constants/akinatorQuestions';
import { ANSWER_SCORES, ScoreAnswer } from './config';

/**
 * 점수 방식 추천 엔진 (S1, US-10).
 * 답이 후보를 지우지 않고 메뉴마다 점수를 쌓는다. 그래서 답 하나를 잘못 골라도 원하던 메뉴가 사라지지 않는다.
 * 기피 태그와 제외한 나라별 분류만 시작 전에 후보에서 뺀다.
 * 모든 함수는 상태를 바꾸지 않고 새 상태를 돌려준다 (화면 state에 그대로 넣을 수 있게).
 */

export interface AnswerRecord {
  questionId: string;
  answer: ScoreAnswer;
}

export interface ScoreContribution {
  questionId: string;
  answer: ScoreAnswer;
  /** 메뉴가 질문의 속성을 가졌는지 */
  matched: boolean;
  delta: number;
}

export interface ScoreSession {
  candidates: MenuItem[];
  /** 메뉴 이름 → 지금까지의 점수 */
  scores: Record<string, number>;
  /** 메뉴 이름 → 점수가 바뀐 근거 (추천 이유 칩에 쓴다) */
  contributions: Record<string, ScoreContribution[]>;
  answers: AnswerRecord[];
}

export interface RankedMenu {
  item: MenuItem;
  score: number;
  contributions: ScoreContribution[];
}

export interface SessionOptions {
  avoidTags?: string[];
  excludedCategories?: string[];
}

/** 기피 태그가 하나라도 붙은 메뉴와 제외한 나라별 분류를 뺀 후보로 시작한다. 이 둘은 점수와 관계없이 결과에 나오지 않는다. */
export const createScoreSession = (menus: MenuItem[], options: SessionOptions = {}): ScoreSession => {
  const avoid = options.avoidTags ?? [];
  const excluded = options.excludedCategories ?? [];
  const candidates = menus.filter(
    item => !excluded.includes(item.category) && !getAvoidTags(item).some(tag => avoid.includes(tag))
  );

  const scores: Record<string, number> = {};
  const contributions: Record<string, ScoreContribution[]> = {};
  candidates.forEach(item => {
    scores[item.name] = 0;
    contributions[item.name] = [];
  });
  return { candidates, scores, contributions, answers: [] };
};

/** 답 하나를 점수에 반영한다. 후보 수는 바뀌지 않는다. */
export const applyScoreAnswer = (session: ScoreSession, question: Question, answer: ScoreAnswer): ScoreSession => {
  const table = ANSWER_SCORES[answer];
  const scores = { ...session.scores };
  const contributions = { ...session.contributions };

  session.candidates.forEach(item => {
    const matched = matchesQuestion(item, question);
    const delta = matched ? table.match : table.miss;
    scores[item.name] += delta;
    if (delta !== 0) {
      contributions[item.name] = [...contributions[item.name], { questionId: question.id, answer, matched, delta }];
    }
  });

  return {
    candidates: session.candidates,
    scores,
    contributions,
    answers: [...session.answers, { questionId: question.id, answer }],
  };
};

/** 점수 높은 순. 동점이면 메뉴 데이터 순서를 지킨다 (같은 답에 같은 결과). */
export const rankCandidates = (session: ScoreSession): RankedMenu[] =>
  session.candidates
    .map((item, index) => ({ item, index, score: session.scores[item.name], contributions: session.contributions[item.name] }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item, score, contributions }) => ({ item, score, contributions }));
