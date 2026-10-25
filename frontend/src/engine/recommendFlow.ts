import { MenuItem } from '../constants/menuData';
import { Question, matchesQuestion } from '../constants/akinatorQuestions';
import {
  MAX_QUESTIONS,
  MAX_REASON_CHIPS,
  RESULT_SIZE,
  RETRY_EXTRA_QUESTIONS,
  RETRY_MIN_QUESTIONS,
  RETRY_WORLDCUP_SIZE,
  SITUATION_QUESTION_LIMIT,
  SPLIT_TOP_N,
  STOP_LEAD,
  ScoreAnswer,
} from './config';
import { RankedMenu, ScoreSession, applyScoreAnswer, rankCandidates } from './scoreEngine';

/**
 * 질문 순서, 상황 질문 필터, 멈춤 조건, 결과와 추천 이유 (S2, US-11 · US-12).
 * 점수 계산 자체는 scoreEngine.ts.
 */

export interface RecommendSession extends ScoreSession {
  /** 상황 질문 답으로 붙는 이유 (모든 남은 후보에 공통) */
  situationReasons: string[];
  /** 지금까지 "틀렸어요"로 뺀 메뉴 이름 (US-15) */
  rejected: string[];
  /** 이 답 수에 닿으면 멈춘다. 처음엔 MAX_QUESTIONS, "틀렸어요" 뒤엔 그때 답 수 + 3 */
  questionLimit: number;
  /** 이 답 수 전에는 1위가 앞서도 멈추지 않는다 ("틀렸어요" 뒤 최소 질문) */
  minAnswers: number;
}

export const toRecommendSession = (session: ScoreSession): RecommendSession => ({
  ...session,
  situationReasons: [],
  rejected: [],
  questionLimit: MAX_QUESTIONS,
  minAnswers: 0,
});

const askedIds = (session: ScoreSession) => new Set(session.answers.map(a => a.questionId));

const splitsCandidates = (candidates: MenuItem[], q: Question) => {
  const yes = candidates.filter(item => matchesQuestion(item, q)).length;
  return yes > 0 && yes < candidates.length;
};

// 상황 질문은 답이 확실하므로 맞지 않는 메뉴를 후보에서 뺀다. 무엇을 남길지는 질문의 속성마다 다르다.
const situationKeep = (q: Question, answer: ScoreAnswer): ((item: MenuItem) => boolean) | null => {
  if (answer !== 'yes' && answer !== 'no') return null; // 아마도·상관없음은 거르지 않는다
  switch (q.attribute) {
    case 'party':
      return answer === 'yes' ? item => item.party === 'solo' : null;
    case 'serving':
      return answer === 'yes' ? item => item.serving !== 'dine_in' : item => item.serving !== 'delivery';
    case 'price':
      return answer === 'yes' ? item => item.price === 'low' : null;
    default:
      return null;
  }
};

/** 답 하나를 반영한다. 상황 질문은 후보를 거르고(전부 사라지면 거르지 않음), 취향 질문은 점수를 쌓는다. */
export const answerQuestion = (session: RecommendSession, q: Question, answer: ScoreAnswer): RecommendSession => {
  if (q.kind === 'taste') {
    return { ...session, ...applyScoreAnswer(session, q, answer) };
  }

  const keep = situationKeep(q, answer);
  const filtered = keep ? session.candidates.filter(keep) : session.candidates;
  const candidates = filtered.length > 0 ? filtered : session.candidates;
  const reason = answer === 'yes' ? q.reason.yes : answer === 'no' ? q.reason.no : null;

  return {
    ...session,
    candidates,
    answers: [...session.answers, { questionId: q.id, answer }],
    situationReasons: reason && keep ? [...session.situationReasons, reason] : session.situationReasons,
  };
};

/**
 * 다음 질문.
 * 1. 상황 질문을 최대 2개, 정의된 순서대로 (후보를 실제로 나누는 것만)
 * 2. 취향 질문 중 상위 후보들의 점수 합을 가장 반반에 가깝게 나누는 것. 동점이면 정의 순서.
 * 더 물을 질문이 없으면 null.
 */
export const pickNextQuestion = (session: RecommendSession, questions: Question[]): Question | null => {
  const asked = askedIds(session);
  const situationAsked = questions.filter(q => q.kind === 'situation' && asked.has(q.id)).length;

  if (situationAsked < SITUATION_QUESTION_LIMIT) {
    const situation = questions.find(
      q => q.kind === 'situation' && !asked.has(q.id) && splitsCandidates(session.candidates, q)
    );
    if (situation) return situation;
  }

  const top = rankCandidates(session).slice(0, SPLIT_TOP_N);
  if (top.length < 2) return null;
  const minScore = Math.min(...top.map(r => r.score));
  // 점수가 높은 후보일수록 무게를 더 준다 (최하위도 1)
  const weighted = top.map(r => ({ item: r.item, weight: r.score - minScore + 1 }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);

  let best: Question | null = null;
  let bestGap = Infinity;
  questions.forEach(q => {
    if (q.kind !== 'taste' || asked.has(q.id)) return;
    const matched = weighted.filter(w => matchesQuestion(w.item, q)).reduce((sum, w) => sum + w.weight, 0);
    if (matched === 0 || matched === total) return; // 상위 후보를 전혀 나누지 못하는 질문은 묻지 않는다
    const gap = Math.abs(2 * matched - total);
    if (gap < bestGap) {
      bestGap = gap;
      best = q;
    }
  });
  return best;
};

/** 멈춤 조건: 1위가 2위보다 3점 이상 앞섬 · 질문 한도(처음 7문항) · 남은 질문 없음 */
export const shouldStop = (session: RecommendSession, questions: Question[]): boolean => {
  if (session.answers.length >= session.questionLimit) return true;
  const ranked = rankCandidates(session);
  if (
    session.answers.length >= session.minAnswers &&
    ranked.length >= 2 &&
    ranked[0].score - ranked[1].score >= STOP_LEAD
  ) {
    return true;
  }
  return pickNextQuestion(session, questions) === null;
};

/** 메뉴가 2개 이상 남아야 "틀렸어요"로 하나를 뺄 수 있다 */
export const canReject = (session: RecommendSession): boolean => session.candidates.length >= 2;

/**
 * "틀렸어요" (US-15): 보여준 1위를 후보에서 빼고, 점수는 그대로 둔 채 질문을 2~3개 더 묻는다.
 * 뺀 메뉴는 이 세션에서 다시 나오지 않는다.
 */
export const rejectTopResult = (session: RecommendSession, menuName: string): RecommendSession => {
  if (!canReject(session)) return session;
  return {
    ...session,
    candidates: session.candidates.filter(item => item.name !== menuName),
    rejected: [...session.rejected, menuName],
    questionLimit: session.answers.length + RETRY_EXTRA_QUESTIONS,
    minAnswers: session.answers.length + RETRY_MIN_QUESTIONS,
  };
};

/** 보정까지 더한 순위. 동점이면 엔진 순위를 따른다 */
const rankAdjusted = (session: RecommendSession, adjustments: Record<string, number>) =>
  rankCandidates(session)
    .map((r, index) => ({ ...r, index, finalScore: r.score + (adjustments[r.item.name] ?? 0) }))
    .sort((a, b) => b.finalScore - a.finalScore || a.index - b.index)
    .map(({ index, ...r }) => r);

/** 두 번째 "틀렸어요" 뒤 제안하는 월드컵 후보: 남은 후보 중 상위 4개 */
export const worldCupCandidates = (
  session: RecommendSession,
  adjustments: Record<string, number> = {}
): MenuItem[] => rankAdjusted(session, adjustments).slice(0, RETRY_WORLDCUP_SIZE).map(r => r.item);

export interface RecommendResult extends RankedMenu {
  /** 결과 화면 칩 문구. 실제로 점수를 올린 답과 상황 답에서 나온다 */
  reasons: string[];
  /** 개인화 보정을 더한 최종 점수 */
  finalScore: number;
}

/**
 * 1위 + 대안 2개와 추천 이유.
 * adjustments: 메뉴 이름 → 점수 보정 (최근 먹은 메뉴 감점 등, S4에서 즐겨찾기까지 확장)
 * size: 몇 개까지 (기본 1위 + 대안 2개, 월드컵 제안은 4개)
 * extraReasons: 메뉴 이름 → 덧붙일 이유 (날씨·시간대 보정 등)
 */
export const getResults = (
  session: RecommendSession,
  questions: Question[],
  adjustments: Record<string, number> = {},
  size: number = RESULT_SIZE,
  extraReasons: Record<string, string> = {}
): RecommendResult[] => {
  const byId = new Map(questions.map(q => [q.id, q]));
  return rankAdjusted(session, adjustments)
    .slice(0, size)
    .map(r => {
      const tasteReasons = r.contributions
        .filter(c => c.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .map(c => {
          const q = byId.get(c.questionId);
          return q ? (c.matched ? q.reason.yes : q.reason.no) : null;
        })
        .filter((text): text is string => !!text);
      const extra = extraReasons[r.item.name];
      const base = Array.from(new Set([...tasteReasons, ...session.situationReasons]));
      // 날씨·시간대 보정은 점수에 들어갔으니 칩이 꽉 차도 한 자리는 남겨 둔다
      const unique =
        extra && !base.includes(extra) ? [...base.slice(0, MAX_REASON_CHIPS - 1), extra] : base.slice(0, MAX_REASON_CHIPS);
      return { ...r, reasons: unique.length > 0 ? unique : [r.item.category] };
    });
};
