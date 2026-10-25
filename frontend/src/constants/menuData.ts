/**
 * 메뉴 데이터 v2. 값은 docs/menu-attributes.md 기준표로 정한다.
 * category(나라별)는 화면 표시와 기록 저장에 그대로 쓰는 한국어 라벨이다.
 */
export type Cuisine = '한식' | '중식' | '일식' | '양식' | '분식' | '아시안';
export type Base = 'rice' | 'noodle' | 'bread' | 'meat' | 'etc';
export type SpicyLevel = 0 | 1 | 2 | 3;
export type Temperature = 'hot' | 'cold';
export type Weight = 'light' | 'normal' | 'heavy';
export type PriceRange = 'low' | 'mid' | 'high'; // 1만원 이하 / 1~2만원 / 2만원 초과 (1인 기준)
export type Serving = 'dine_in' | 'delivery' | 'both';
export type Party = 'solo' | 'group';
/** 직접 입력하는 기피 태그. '매운맛'은 spicy >= 2 에서 자동으로 붙는다 (getAvoidTags) */
export type StoredAvoidTag = '밀가루' | '해산물' | '날것' | '오이' | '가지';
export type AvoidTag = StoredAvoidTag | '매운맛';

export interface MenuItem {
  name: string;
  emoji: string;
  category: Cuisine;
  base: Base;
  soup: boolean;
  spicy: SpicyLevel;
  temperature: Temperature;
  weight: Weight;
  price: PriceRange;
  serving: Serving;
  party: Party;
  avoidTags: StoredAvoidTag[];
  desc: string;
}

export const CUISINES: Cuisine[] = ['한식', '중식', '일식', '양식', '분식', '아시안'];
export const AVOID_TAG_OPTIONS: AvoidTag[] = ['매운맛', '밀가루', '해산물', '날것', '오이', '가지'];
export const SPICY_TAG_LEVEL = 2;

export const getAvoidTags = (item: MenuItem): AvoidTag[] =>
  item.spicy >= SPICY_TAG_LEVEL ? ['매운맛', ...item.avoidTags] : [...item.avoidTags];

export const MENU_DATA: MenuItem[] = [
  // --- 한식 (14종) ---
  { name: '김치찌개', emoji: '🍲', category: '한식', base: 'rice', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '칼칼하고 얼큰한 한국인의 소울푸드' },
  { name: '된장찌개', emoji: '🥘', category: '한식', base: 'rice', soup: true, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '구수하고 깊은 맛의 전통 찌개' },
  { name: '삼겹살', emoji: '🥩', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: [], desc: '지글지글 구워 먹는 영원한 회식 1순위' },
  { name: '제육볶음', emoji: '🐷', category: '한식', base: 'rice', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '매콤한 양념에 불맛을 더한 고기 반찬의 왕' },
  { name: '육개장', emoji: '🥣', category: '한식', base: 'rice', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '얼큰한 국물 속에 소고기와 고사리가 가득' },
  { name: '비빔밥', emoji: '🥗', category: '한식', base: 'rice', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '다채로운 나물과 참기름 향 가득한 건강 한 끼' },
  { name: '소불고기', emoji: '🍖', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: [], desc: '단짠 양념에 부드러운 소고기가 조화로운 불고기' },
  { name: '닭갈비', emoji: '🐔', category: '한식', base: 'meat', soup: false, spicy: 2, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: [], desc: '철판에 볶아 매콤달콤 쫄깃한 닭고기 요리' },
  { name: '삼계탕', emoji: '🐔🍲', category: '한식', base: 'meat', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: [], desc: '인삼과 대추를 넣어 푹 고아낸 보양식' },
  { name: '칼국수', emoji: '🍜', category: '한식', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '진한 멸치 육수에 손맛이 살아있는 손칼국수' },
  { name: '갈비탕', emoji: '🥣🥩', category: '한식', base: 'meat', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: [], desc: '두툼한 갈빗대와 맑고 깊은 고기 육수의 조화' },
  { name: '순대국밥', emoji: '🍲', category: '한식', base: 'rice', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: [], desc: '들깨가루 듬뿍, 잡내 없이 구수한 순대국밥' },
  { name: '족발', emoji: '🐖', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'cold', weight: 'heavy', price: 'high', serving: 'both', party: 'group', avoidTags: [], desc: '쫀득하고 야들야들한 콜라겐 가득 족발' },
  { name: '보쌈', emoji: '🥩🥬', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'both', party: 'group', avoidTags: [], desc: '기름기를 쏙 빼서 야들야들 담백한 수육 보쌈' },

  // --- 분식 (1종) ---
  { name: '떡볶이', emoji: '🍢', category: '분식', base: 'etc', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '매콤달콤 쫄깃쫄깃 최고의 국민 분식 대장' },

  // --- 중식 (11종) ---
  { name: '짜장면', emoji: '🍜', category: '중식', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '달콤 짭조름한 국민 중식 면요리' },
  { name: '짬뽕', emoji: '🌶️🍜', category: '중식', base: 'noodle', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '얼큰한 국물과 풍성한 해산물의 조화' },
  { name: '탕수육', emoji: '🐖🥢', category: '중식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루'], desc: '바삭하게 튀겨 달콤 새콤 소스를 끼얹은 고기' },
  { name: '마라탕', emoji: '🍲🌶️', category: '중식', base: 'etc', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '중독성 강한 매콤 알싸한 사천식 국물탕' },
  { name: '마라샹궈', emoji: '🥘🌶️', category: '중식', base: 'etc', soup: false, spicy: 2, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물'], desc: '알싸한 마라 양념에 다양한 재료를 볶아낸 요리' },
  { name: '볶음밥', emoji: '🍚🇨🇳', category: '중식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '고슬고슬 불맛 가득 볶아낸 정통 중식 볶음밥' },
  { name: '양장피', emoji: '🥗🇨🇳', category: '중식', base: 'etc', soup: false, spicy: 1, temperature: 'cold', weight: 'normal', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['해산물', '오이'], desc: '겨자 소스 톡 쏘는 다채로운 해산물 잡채 요리' },
  { name: '깐풍기', emoji: '🐔🇨🇳', category: '중식', base: 'meat', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루'], desc: '매콤달콤 깐풍 소스에 볶아낸 바삭한 닭고기' },
  { name: '동파육', emoji: '🥩🇨🇳', category: '중식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'dine_in', party: 'group', avoidTags: [], desc: '입안에서 녹아내리는 극상의 부드러운 오겹살찜' },
  { name: '어향가지', emoji: '🍆', category: '중식', base: 'etc', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['가지', '밀가루'], desc: '어향 소스로 감칠맛을 극대화한 촉촉한 가지 튀김' },
  { name: '지삼선', emoji: '🥔🍆', category: '중식', base: 'etc', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['가지', '밀가루'], desc: '땅에서 나는 세 가지 보물(감자, 피망, 가지) 볶음' },

  // --- 일식 (12종) ---
  { name: '돈까스', emoji: '🍛', category: '일식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '바삭바삭한 튀김옷과 두툼한 등심의 만남' },
  { name: '초밥', emoji: '🍣', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'cold', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것'], desc: '신선한 횟감과 알맞게 쥔 밥의 예술' },
  { name: '라멘', emoji: '🍜🇯🇵', category: '일식', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루'], desc: '진한 돈사골 육수와 부드러운 차슈의 조화' },
  { name: '우동', emoji: '🍲🇯🇵', category: '일식', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '가쓰오부시 국물에 오동통한 면발이 맛있는 우동' },
  { name: '메밀소바', emoji: '🧊🍜', category: '일식', base: 'noodle', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: [], desc: '살얼음 둥둥 쯔유 소스에 적셔 먹는 시원한 소바' },
  { name: '규동', emoji: '🍚🇯🇵', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '달콤한 소스에 소고기와 양파를 졸여 올린 덮밥' },
  { name: '텐동', emoji: '🍤🍚', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '바삭한 해산물/채소 튀김이 한가득 올라간 튀김덮밥' },
  { name: '회덮밥', emoji: '🐟🍚', category: '일식', base: 'rice', soup: false, spicy: 2, temperature: 'cold', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것'], desc: '신선한 활어회와 야채를 초고추장에 비벼먹는 밥' },
  { name: '일식 카레', emoji: '🍛🇯🇵', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '오랜 시간 뭉근하게 끓여 부드럽고 진한 숙성 카레' },
  { name: '야키소바', emoji: '🍝🇯🇵', category: '일식', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루'], desc: '단짠 소스에 고기와 야채를 함께 볶아낸 면요리' },
  { name: '타코야끼', emoji: '🐙🔴', category: '일식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'light', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '쫄깃쫄깃 문어가 콕 박힌 오사카 정통 길거리 간식' },
  { name: '사시미', emoji: '🐟🥢', category: '일식', base: 'etc', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['해산물', '날것'], desc: '신선한 원어를 정성스레 썰어낸 극상의 깔끔함' },

  // --- 양식 (8종) ---
  { name: '피자', emoji: '🍕', category: '양식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루'], desc: '고소한 치즈가 듬뿍 토핑된 이탈리안 푸드' },
  { name: '햄버거', emoji: '🍔', category: '양식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '두툼한 수제 패티와 신선한 채소의 완벽 조합' },
  { name: '파스타', emoji: '🍝', category: '양식', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루'], desc: '부드러운 크림 또는 상큼한 토마토 소스 면요리' },
  { name: '스테이크', emoji: '🥩🍴', category: '양식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'dine_in', party: 'solo', avoidTags: [], desc: '육즙을 꽉 잡아 입안에서 팡 튀는 그릴 스테이크' },
  { name: '리조또', emoji: '🍚🇮🇹', category: '양식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: [], desc: '크림 또는 토마토 소스에 부드럽게 익힌 이탈리안 쌀요리' },
  { name: '연어 샐러드', emoji: '🥗🐟', category: '양식', base: 'etc', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것'], desc: '신선한 연어와 채소, 새콤달콤 드레싱의 만남' },
  { name: '샌드위치', emoji: '🥪', category: '양식', base: 'bread', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '가벼운 식사 대용으로 아주 깔끔하고 신선한 토스트' },
  { name: '타코', emoji: '🌮', category: '양식', base: 'bread', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루'], desc: '또띠아 위에 고기, 야채, 살사 소스를 듬뿍 올린 맥시칸 요리' },

  // --- 아시안 (4종) ---
  { name: '쌀국수', emoji: '🍜🇻🇳', category: '아시안', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: [], desc: '맑고 담백한 소고기 육수와 향긋한 베트남식 면' },
  { name: '팟타이', emoji: '🍝🇹🇭', category: '아시안', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물'], desc: '새콤달콤한 소스에 새우와 두부를 볶아낸 태국식 볶음면' },
  { name: '똠양꿍', emoji: '🍲🌶️🇹🇭', category: '아시안', base: 'etc', soup: true, spicy: 2, temperature: 'hot', weight: 'light', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['해산물'], desc: '세계 3대 스프, 매콤새콤 신비로운 태국식 새우 스프' },
  { name: '나시고랭', emoji: '🍛🇮🇩', category: '아시안', base: 'rice', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물'], desc: '단짠 소스에 해산물을 넣고 고슬고슬 볶아낸 인도네시아 볶음밥' },
];
