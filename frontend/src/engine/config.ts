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
