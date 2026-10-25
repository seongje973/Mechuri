import { MenuItem, getAvoidTags, AvoidTag, Base, Cuisine, Party, PriceRange, Serving, Temperature, Weight } from './menuData';

/**
 * 질문은 메뉴 속성 하나와 값 하나로 정의한다. 메뉴 이름은 여기에 쓰지 않는다.
 * 메뉴를 추가할 때는 menuData.ts에 속성만 채우면 질문이 자동으로 맞춰진다.
 *
 * - taste(취향): 점수만 올리거나 내린다.
 * - situation(상황): 답이 확실하므로 S2부터 후보를 거르는 필터로 쓴다 (US-11).
 */
export type QuestionKind = 'taste' | 'situation';

export type QuestionCondition =
  | { attribute: 'category'; value: Cuisine }
  | { attribute: 'base'; value: Base }
  | { attribute: 'soup'; value: boolean }
  | { attribute: 'spicyAtLeast'; value: number }
  | { attribute: 'temperature'; value: Temperature }
  | { attribute: 'weight'; value: Weight }
  | { attribute: 'price'; value: PriceRange }
  | { attribute: 'serving'; value: Serving }
  | { attribute: 'party'; value: Party }
  | { attribute: 'avoidTag'; value: AvoidTag };

export type Question = QuestionCondition & {
  id: string;
  kind: QuestionKind;
  text: string;
  /** 결과 화면의 추천 이유 칩 문구 ("예"에 가까운 답일 때 / "아니오"일 때) */
  reason: { yes: string; no: string };
};

/** 메뉴가 질문의 속성 값을 가졌는지 */
export const matchesQuestion = (item: MenuItem, q: Question): boolean => {
  switch (q.attribute) {
    case 'spicyAtLeast':
      return item.spicy >= q.value;
    case 'avoidTag':
      return getAvoidTags(item).includes(q.value);
    case 'serving':
      // 매장·배달 둘 다 되는 메뉴는 어느 쪽 질문에도 맞는다
      return item.serving === q.value || item.serving === 'both';
    default:
      return item[q.attribute] === q.value;
  }
};

export const QUESTIONS: Question[] = [
  // 상황
  { id: 'party-solo', kind: 'situation', attribute: 'party', value: 'solo', text: '혼자 드시나요?', reason: { yes: '혼밥 가능', no: '여럿이' } },
  { id: 'serving-delivery', kind: 'situation', attribute: 'serving', value: 'delivery', text: '배달로 드실 건가요?', reason: { yes: '배달 OK', no: '매장에서' } },
  { id: 'price-low', kind: 'situation', attribute: 'price', value: 'low', text: '만 원 이하로 드실 건가요?', reason: { yes: '만 원 이하', no: '조금 더 써도 OK' } },

  // 취향: 나라별
  { id: 'cuisine-korean', kind: 'taste', attribute: 'category', value: '한식', text: '한식이 당기세요?', reason: { yes: '한식', no: '한식 말고' } },
  { id: 'cuisine-chinese', kind: 'taste', attribute: 'category', value: '중식', text: '중식은 어떠세요?', reason: { yes: '중식', no: '중식 말고' } },
  { id: 'cuisine-japanese', kind: 'taste', attribute: 'category', value: '일식', text: '일식은 어떠세요?', reason: { yes: '일식', no: '일식 말고' } },
  { id: 'cuisine-western', kind: 'taste', attribute: 'category', value: '양식', text: '양식이 끌리세요?', reason: { yes: '양식', no: '양식 말고' } },
  { id: 'cuisine-bunsik', kind: 'taste', attribute: 'category', value: '분식', text: '분식이 당기세요?', reason: { yes: '분식', no: '분식 말고' } },
  { id: 'cuisine-asian', kind: 'taste', attribute: 'category', value: '아시안', text: '쌀국수·팟타이 같은 아시안 음식은요?', reason: { yes: '아시안', no: '아시안 말고' } },

  // 취향: 주재료
  { id: 'base-rice', kind: 'taste', attribute: 'base', value: 'rice', text: '밥이 있어야 하나요?', reason: { yes: '밥', no: '밥 말고' } },
  { id: 'base-noodle', kind: 'taste', attribute: 'base', value: 'noodle', text: '면 요리는 어떠세요?', reason: { yes: '면', no: '면 말고' } },
  { id: 'base-bread', kind: 'taste', attribute: 'base', value: 'bread', text: '빵이나 밀가루 반죽 음식은요?', reason: { yes: '빵·반죽', no: '빵 말고' } },
  { id: 'base-meat', kind: 'taste', attribute: 'base', value: 'meat', text: '고기를 제대로 먹고 싶으세요?', reason: { yes: '고기', no: '고기 말고' } },

  // 취향: 맛과 느낌
  { id: 'soup', kind: 'taste', attribute: 'soup', value: true, text: '국물이 있었으면 하나요?', reason: { yes: '국물 O', no: '국물 X' } },
  { id: 'spicy', kind: 'taste', attribute: 'spicyAtLeast', value: 2, text: '매운 게 당기세요?', reason: { yes: '매운맛', no: '안 매운 맛' } },
  { id: 'cold', kind: 'taste', attribute: 'temperature', value: 'cold', text: '시원하거나 차가운 게 좋아요?', reason: { yes: '시원하게', no: '따뜻하게' } },
  { id: 'weight-light', kind: 'taste', attribute: 'weight', value: 'light', text: '가볍게 먹고 싶으세요?', reason: { yes: '가볍게', no: '가볍지 않게' } },
  { id: 'weight-heavy', kind: 'taste', attribute: 'weight', value: 'heavy', text: '든든하게 배 채우고 싶으세요?', reason: { yes: '든든하게', no: '부담 없이' } },
  { id: 'raw', kind: 'taste', attribute: 'avoidTag', value: '날것', text: '회나 초밥 같은 날것도 괜찮으세요?', reason: { yes: '회·날것', no: '익힌 음식' } },
];
