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

/** 아침: 5시 ~ 10시 */
export const BREAKFAST_START_HOUR = 5;
export const BREAKFAST_END_HOUR = 10;
/** 평일 점심: 월~금 11시 ~ 14시 */
export const LUNCH_START_HOUR = 11;
export const LUNCH_END_HOUR = 14;
/** 금·토 저녁: 17시 ~ 22시 */
export const DINNER_START_HOUR = 17;
export const DINNER_END_HOUR = 22;

/** 취향 설정에서 고른 좋아하는 나라별 음식 보너스 */
export const LIKED_CUISINE_BONUS = 1;
/** 기록에서 배운 "요즘 자주 먹는" 나라별 음식 보너스. 직접 고른 취향보다 약하게 */
export const LEARNED_CUISINE_BONUS = 0.5;
/** 최근 이 기간의 식사 기록으로 자주 먹는 나라별 음식을 찾는다 */
export const LEARN_DAYS = 30;
/** 기록이 이만큼은 있어야 배운다 */
export const LEARN_MIN_MEALS = 3;
/** 이 비율 이상 먹은 나라별 음식만 "자주 먹는" 것으로 본다 */
export const LEARN_MIN_SHARE = 0.4;
/** 매운맛 취향: "매운 거 좋아요"면 맵기 2 이상 메뉴 보너스, "안 매운 게 좋아요"면 맵기 1당 감점 */
export const SPICY_LOVER_BONUS = 1;
export const SPICY_MILD_PENALTY_PER_LEVEL = -0.5;

/** 기록에서 배우는 속성별 취향(주재료·국물·맵기·무게·온도). 이만큼은 먹은 기록이 있어야 배운다 */
export const PROFILE_MIN_MEALS = 5;
/** (내 기록에서의 비율 - 전체 메뉴에서의 비율) 1.0당 점수 */
export const PROFILE_WEIGHT = 2;
/** 속성별 취향 보정은 메뉴 하나에 이 값까지만 (위·아래 모두) */
export const PROFILE_MAX_BONUS = 1.5;
/** 비율 차이가 이만큼은 나야 결과 이유 칩에 쓴다 */
export const PROFILE_REASON_LIFT = 0.2;

/** 6개 속성(나라·주재료·국물·맵기·온도·무게) 중 이만큼 같으면 "비슷한 메뉴"로 본다 */
export const SIMILAR_MIN_SHARED = 5;
/** 최근에 먹은 메뉴와 비슷한 메뉴 감점. 같은 메뉴 감점(RECENT_MEAL_PENALTY)보다 약하고 짧게 */
export const SIMILAR_MEAL_PENALTY = -1;
export const SIMILAR_MEAL_DAYS = 2;

/** "틀렸어요"로 거절한 메뉴 감점: 최근 이 기간의 거절 한 번마다, 메뉴 하나에 REJECT_MAX_PENALTY까지 */
export const REJECT_LEARN_DAYS = 14;
export const REJECT_PENALTY = -1;
export const REJECT_MAX_PENALTY = -3;
/** 거절한 메뉴와 비슷한 메뉴 감점 (한 번만) */
export const REJECT_SIMILAR_PENALTY = -0.5;
