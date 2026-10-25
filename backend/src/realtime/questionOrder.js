// 같이 정하기에서 모두가 받을 질문 순서. 서버가 정해서 id만 내려주고,
// 앱은 frontend/src/constants/akinatorQuestions.ts에서 같은 id로 문구를 찾는다.
// 그 파일의 id를 바꾸면 여기도 바꿔야 한다 (test/questionOrder.test.js가 확인).

const MAX_QUESTIONS = 7;
// 같은 속성 질문이 몰리지 않게 (예: 나라별 질문만 4개)
const MAX_PER_ATTRIBUTE = 2;

// 모임이니 '혼자 드시나요?'(party-solo)는 묻지 않는다
const SITUATION_QUESTIONS = ['serving-delivery', 'price-low'];

const TASTE_QUESTIONS = [
  { id: 'cuisine-korean', attribute: 'category' },
  { id: 'cuisine-chinese', attribute: 'category' },
  { id: 'cuisine-japanese', attribute: 'category' },
  { id: 'cuisine-western', attribute: 'category' },
  { id: 'cuisine-bunsik', attribute: 'category' },
  { id: 'cuisine-asian', attribute: 'category' },
  { id: 'base-rice', attribute: 'base' },
  { id: 'base-noodle', attribute: 'base' },
  { id: 'base-bread', attribute: 'base' },
  { id: 'base-meat', attribute: 'base' },
  { id: 'soup', attribute: 'soup' },
  { id: 'spicy', attribute: 'spicyAtLeast' },
  { id: 'cold', attribute: 'temperature' },
  { id: 'weight-light', attribute: 'weight' },
  { id: 'weight-heavy', attribute: 'weight' },
  { id: 'raw', attribute: 'avoidTag' }
];

const shuffle = (items, random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** 상황 질문을 먼저, 나머지는 취향 질문을 섞어서 MAX_QUESTIONS개 */
const pickQuestionOrder = (random = Math.random) => {
  const picked = [...SITUATION_QUESTIONS];
  const perAttribute = {};
  for (const q of shuffle(TASTE_QUESTIONS, random)) {
    if (picked.length >= MAX_QUESTIONS) break;
    if ((perAttribute[q.attribute] || 0) >= MAX_PER_ATTRIBUTE) continue;
    perAttribute[q.attribute] = (perAttribute[q.attribute] || 0) + 1;
    picked.push(q.id);
  }
  return picked;
};

const ALL_QUESTION_IDS = [...SITUATION_QUESTIONS, ...TASTE_QUESTIONS.map((q) => q.id)];

module.exports = { pickQuestionOrder, ALL_QUESTION_IDS, MAX_QUESTIONS };
