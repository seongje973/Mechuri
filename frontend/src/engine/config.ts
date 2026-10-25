/**
 * 점수 방식 엔진의 조정 값. S7 지인 테스트 뒤 이 파일만 고쳐서 튜닝한다.
 * 기준: 기획서 "질문과 추천 로직 > 4. 답변 처리"
 */
export type ScoreAnswer = 'yes' | 'probably' | 'dontcare' | 'no';

/** 답변별 점수. match = 질문의 속성을 가진 메뉴, miss = 안 가진 메뉴 */
export const ANSWER_SCORES: Record<ScoreAnswer, { match: number; miss: number }> = {
  yes: { match: 2, miss: -2 },
  probably: { match: 1, miss: 0 },
  dontcare: { match: 0, miss: 0 },
  no: { match: -2, miss: 1 },
};

/** 질문은 최대 7개 (기획서 제품 원칙) */
export const MAX_QUESTIONS = 7;
/** 1위가 2위보다 이만큼 앞서면 바로 결과를 보여준다 */
export const STOP_LEAD = 3;
/** 맨 앞에 묻는 상황 질문 수 (인원·먹는 방식·예산 중) */
export const SITUATION_QUESTION_LIMIT = 2;
/** 다음 질문을 고를 때 반반으로 나눌 상위 후보 수 */
export const SPLIT_TOP_N = 10;
/** 결과에 보여줄 메뉴 수 (1위 + 대안 2개) */
export const RESULT_SIZE = 3;
/** "바로 결과 보기" 버튼을 보여주기 시작하는 질문 번호 */
export const SHOW_SKIP_FROM_QUESTION = 3;
/** 결과 카드에 붙이는 추천 이유 칩 최대 개수 */
export const MAX_REASON_CHIPS = 3;

/** 최근에 먹은 메뉴 감점 (기획서: 3일 이내 -2). S4(US-21)에서 즐겨찾기 보너스와 함께 다듬는다 */
export const RECENT_MEAL_PENALTY = -2;
export const RECENT_MEAL_DAYS = 3;
