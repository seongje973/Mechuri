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

/** 최근에 먹은 메뉴 감점 (기획서: 3일 이내 -2) */
export const RECENT_MEAL_PENALTY = -2;
export const RECENT_MEAL_DAYS = 3;

/** "틀렸어요" 뒤에 더 묻는 질문 수 (US-15) */
export const RETRY_EXTRA_QUESTIONS = 3;
/** "틀렸어요" 뒤에 1위가 크게 앞서도 최소한 묻는 질문 수 */
export const RETRY_MIN_QUESTIONS = 2;
/** 두 번째 "틀렸어요"부터는 상위 몇 개로 월드컵을 제안할지 */
export const RETRY_WORLDCUP_SIZE = 4;

/** 즐겨찾기한 메뉴 보너스 (US-21) */
export const FAVORITE_BONUS = 1;

/** 날씨·시간대 상황 보정 (L-02). 메뉴 하나에 상황 보정은 이 값까지만 */
export const CONTEXT_BONUS = 1;
/** 결과를 낼 때 아직 안 온 날씨를 기다리는 최대 시간 */
export const WEATHER_WAIT_MS = 1500;
/** 이 기온(°C) 이상이면 차가운 음식, 이하이면 따뜻한 국물 */
export const HOT_DAY_TEMP = 27;
export const COLD_DAY_TEMP = 5;
/** 늦은 밤: 22시 ~ 다음 날 4시 */
export const LATE_NIGHT_START_HOUR = 22;
export const LATE_NIGHT_END_HOUR = 4;
