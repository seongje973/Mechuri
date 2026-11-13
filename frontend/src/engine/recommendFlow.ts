import { MenuItem } from '../constants/menuData';
import { Question, matchesQuestion } from '../constants/akinatorQuestions';
import {
  MAX_QUESTIONS,
  MAX_REASON_CHIPS,
  NOVELTY_SCORE_WINDOW,
  RESULT_SIZE,
  RETRY_EXTRA_QUESTIONS,
  RETRY_MIN_QUESTIONS,
  RETRY_WORLDCUP_SIZE,
  QUESTION_TEMPERATURE,
  REJECT_REASON_PENALTY,
  SITUATION_QUESTION_LIMIT,
  STOP_LEAD,
  ScoreAnswer,
} from './config';
import { RankedMenu, ScoreSession, applyScoreAnswer, rankCandidates } from './scoreEngine';
import { isSimilarMenu } from './similarity';

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
    return { ...session, ...applyScoreAnswer(session, q, answer, true) };
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

/** 보정까지 더한 순위. 동점이면 엔진 순위를 따른다 */
const rankAdjusted = (session: RecommendSession, adjustments: Record<string, number>) =>
  rankCandidates(session)
    .map((r, index) => ({ ...r, index, finalScore: r.score + (adjustments[r.item.name] ?? 0) }))
    .sort((a, b) => b.finalScore - a.finalScore || a.index - b.index)
    .map(({ index, ...r }) => r);

/** 점수를 확률로 바꾼다 (softmax). 메뉴 이름 → 확률 */
const menuProbabilities = (session: ScoreSession, adjustments: Record<string, number>): Map<string, number> => {
  const scores = session.candidates.map(item => (session.scores[item.name] + (adjustments[item.name] ?? 0)) / QUESTION_TEMPERATURE);
  const max = Math.max(...scores);
  const weights = scores.map(v => Math.exp(v - max));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return new Map(session.candidates.map((item, i) => [item.name, weights[i] / total]));
};

const entropy = (probabilities: Map<string, number>): number => {
  let h = 0;
  probabilities.forEach(p => {
    if (p > 0) h -= p * Math.log(p);
  });
  return h;
};

/**
 * 다음 질문.
 * 1. 상황 질문을 최대 2개, 정의된 순서대로 (후보를 실제로 나누는 것만)
 * 2. 취향 질문 중 답을 들은 뒤 후보가 가장 많이 좁혀질 것으로 기대되는 것. 동점이면 정의 순서.
 *    점수를 확률로 보고, "응"·"아니" 각각의 답 뒤에 남는 불확실성(엔트로피)의 기댓값이 가장 작은 질문을 고른다.
 * 더 물을 질문이 없으면 null.
 * adjustments: 메뉴 이름 → 개인화 보정. 주면 보정을 더한 점수로 고른다 (이미 아는 취향은 덜 묻게).
 */
export const pickNextQuestion = (
  session: RecommendSession,
  questions: Question[],
  adjustments: Record<string, number> = {}
): Question | null => {
  const asked = askedIds(session);
  const situationAsked = questions.filter(q => q.kind === 'situation' && asked.has(q.id)).length;

  if (situationAsked < SITUATION_QUESTION_LIMIT) {
    const situation = questions.find(
      q => q.kind === 'situation' && !asked.has(q.id) && splitsCandidates(session.candidates, q)
    );
    if (situation) return situation;
  }

  if (session.candidates.length < 2) return null;
  const current = menuProbabilities(session, adjustments);

  let best: Question | null = null;
  let bestExpected = Infinity;
  questions.forEach(q => {
    // 후보를 전혀 나누지 못하는 질문은 묻지 않는다
    if (q.kind !== 'taste' || asked.has(q.id) || !splitsCandidates(session.candidates, q)) return;
    const yesChance = session.candidates.reduce((sum, item) => sum + (matchesQuestion(item, q) ? current.get(item.name)! : 0), 0);
    const after = (answer: ScoreAnswer) => entropy(menuProbabilities(applyScoreAnswer(session, q, answer, true), adjustments));
    const expected = yesChance * after('yes') + (1 - yesChance) * after('no');
    // 부동소수 오차로 정의 순서가 뒤집히지 않게 아주 작은 차이는 동점으로 본다
    if (expected < bestExpected - 1e-9) {
      bestExpected = expected;
      best = q;
    }
  });
  return best;
};

/**
 * 멈춤 조건: 1위가 2위보다 3점 이상 앞섬 · 질문 한도(처음 7문항) · 남은 질문 없음.
 * 개인화 보정(adjustments)도 점수 차이에 넣지만, 보정만으로는 멈추지 않도록 취향 질문에 하나는 답한 뒤에만 본다.
 */
export const shouldStop = (
  session: RecommendSession,
  questions: Question[],
  adjustments: Record<string, number> = {}
): boolean => {
  if (session.answers.length >= session.questionLimit) return true;
  const ranked = rankAdjusted(session, adjustments);
  const asked = askedIds(session);
  if (
    session.answers.length >= session.minAnswers &&
    questions.some(q => q.kind === 'taste' && asked.has(q.id)) &&
    ranked.length >= 2 &&
    ranked[0].finalScore - ranked[1].finalScore >= STOP_LEAD
  ) {
    return true;
  }
  return pickNextQuestion(session, questions, adjustments) === null;
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

export type RejectReason = 'heavy' | 'pricey' | 'similar';

/** "틀렸어요" 뒤에 한 번 탭으로 고르는 이유 (선택) */
export const REJECT_REASONS: { reason: RejectReason; label: string }[] = [
  { reason: 'heavy', label: '너무 무거워요' },
  { reason: 'pricey', label: '비싸요' },
  { reason: 'similar', label: '비슷한 걸 최근에 먹었어요' },
];

const WEIGHT_RANK = { light: 0, normal: 1, heavy: 2 };
const PRICE_RANK = { low: 0, mid: 1, high: 2 };

/**
 * 거절한 이유를 남은 후보에 반영한다: 거절한 메뉴만큼 무겁거나(비싸거나) 비슷한 후보를 감점한다.
 * 이미 가장 가벼운(싼) 메뉴를 거절했으면 바꿀 것이 없다. 이번 추천의 점수만 바꾼다.
 */
export const applyRejectReason = (session: RecommendSession, rejected: MenuItem, reason: RejectReason): RecommendSession => {
  const hit = (item: MenuItem): boolean => {
    switch (reason) {
      case 'heavy':
        return rejected.weight !== 'light' && WEIGHT_RANK[item.weight] >= WEIGHT_RANK[rejected.weight];
      case 'pricey':
        return rejected.price !== 'low' && PRICE_RANK[item.price] >= PRICE_RANK[rejected.price];
      case 'similar':
        return isSimilarMenu(rejected, item);
    }
  };
  const scores = { ...session.scores };
  session.candidates.forEach(item => {
    if (hit(item)) scores[item.name] += REJECT_REASON_PENALTY;
  });
  return { ...session, scores };
};

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
 * 1위 + 대안 2개와 추천 이유. 대안은 이미 고른 메뉴와 비슷한 메뉴를 건너뛰고 고른다 (모자라면 건너뛴 것으로 채움).
 * adjustments: 메뉴 이름 → 점수 보정 (최근 먹은 메뉴 감점 등, S4에서 즐겨찾기까지 확장)
 * size: 몇 개까지 (기본 1위 + 대안 2개, 월드컵 제안은 4개)
 * extraReasons: 메뉴 이름 → 덧붙일 이유 (날씨·시간대, 취향 보정 등)
 * eaten: 먹어 본 메뉴 이름. 결과가 모두 먹어 본 메뉴면 마지막 대안을 점수가 비슷한 안 먹어 본 메뉴로 바꾼다.
 */
export const getResults = (
  session: RecommendSession,
  questions: Question[],
  adjustments: Record<string, number> = {},
  size: number = RESULT_SIZE,
  extraReasons: Record<string, string | string[]> = {},
  eaten: string[] = []
): RecommendResult[] => {
  const byId = new Map(questions.map(q => [q.id, q]));
  const ranked = rankAdjusted(session, adjustments);
  const picked: typeof ranked = [];
  const skipped: typeof ranked = [];
  for (const r of ranked) {
    if (picked.length >= size) break;
    (picked.some(p => isSimilarMenu(p.item, r.item)) ? skipped : picked).push(r);
  }
  const results = [...picked, ...skipped.slice(0, size - picked.length)];
  let fresh: string | null = null;
  if (results.length >= 2 && results.every(r => eaten.includes(r.item.name))) {
    const last = results[results.length - 1];
    const kept = results.slice(0, -1);
    const candidate = ranked.find(
      r =>
        !eaten.includes(r.item.name) &&
        r.finalScore >= last.finalScore - NOVELTY_SCORE_WINDOW &&
        !kept.some(k => isSimilarMenu(k.item, r.item))
    );
    if (candidate) {
      results[results.length - 1] = candidate;
      fresh = candidate.item.name;
    }
  }
  return results
    .map(r => {
      const tasteReasons = r.contributions
        .filter(c => c.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .map(c => {
          const q = byId.get(c.questionId);
          return q ? (c.matched ? q.reason.yes : q.reason.no) : null;
        })
        .filter((text): text is string => !!text);
      const base = Array.from(new Set([...tasteReasons, ...session.situationReasons]));
      // 날씨·시간대·취향 보정은 점수에 들어갔으니 칩이 꽉 차도 자리를 남겨 둔다 (답에서 나온 이유도 하나는 남김)
      const extra = Array.from(new Set(([] as string[]).concat(r.item.name === fresh ? '안 먹어 본 메뉴' : [], extraReasons[r.item.name] ?? [])))
        .filter(text => !base.includes(text))
        .slice(0, base.length > 0 ? MAX_REASON_CHIPS - 1 : MAX_REASON_CHIPS);
      const unique = [...base.slice(0, MAX_REASON_CHIPS - extra.length), ...extra];
      return { ...r, reasons: unique.length > 0 ? unique : [r.item.category] };
    });
};
