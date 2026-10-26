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
/** 직접 입력하는 기피 태그. '매운맛'은 spicy >= 2 에서 자동으로 붙는다 (getAvoidTags). 기준은 docs/menu-attributes.md 10번 */
export type StoredAvoidTag =
  | '밀가루' | '메밀' | '유제품' | '달걀' | '갑각류' | '해산물' | '견과류'
  | '날것' | '돼지고기' | '소고기' | '닭고기' | '오이' | '가지' | '고수';
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
/** 설정 화면에서 묶어 보여 주는 순서. 알레르기든 안 먹는 음식이든 고르면 똑같이 후보에서 빠진다 */
export const ALLERGY_TAG_OPTIONS: AvoidTag[] = ['밀가루', '메밀', '유제품', '달걀', '갑각류', '해산물', '견과류'];
export const DISLIKE_TAG_OPTIONS: AvoidTag[] = ['매운맛', '날것', '돼지고기', '소고기', '닭고기', '오이', '가지', '고수'];
export const AVOID_TAG_OPTIONS: AvoidTag[] = [...ALLERGY_TAG_OPTIONS, ...DISLIKE_TAG_OPTIONS];
export const SPICY_TAG_LEVEL = 2;

export const getAvoidTags = (item: MenuItem): AvoidTag[] =>
  item.spicy >= SPICY_TAG_LEVEL ? ['매운맛', ...item.avoidTags] : [...item.avoidTags];

export const MENU_DATA: MenuItem[] = [
  // --- 한식 (22종) ---
  { name: '김치찌개', emoji: '🍲', category: '한식', base: 'rice', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['돼지고기'], desc: '칼칼하고 얼큰한 한국인의 소울푸드' },
  { name: '된장찌개', emoji: '🥘', category: '한식', base: 'rice', soup: true, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: [], desc: '구수하고 깊은 맛의 전통 찌개' },
  { name: '삼겹살', emoji: '🥩', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['돼지고기'], desc: '지글지글 구워 먹는 영원한 회식 1순위' },
  { name: '제육볶음', emoji: '🐷', category: '한식', base: 'rice', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['돼지고기'], desc: '매콤한 양념에 불맛을 더한 고기 반찬의 왕' },
  { name: '육개장', emoji: '🥣', category: '한식', base: 'rice', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['소고기', '달걀'], desc: '얼큰한 국물 속에 소고기와 고사리가 가득' },
  { name: '비빔밥', emoji: '🥗', category: '한식', base: 'rice', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['달걀'], desc: '다채로운 나물과 참기름 향 가득한 건강 한 끼' },
  { name: '소불고기', emoji: '🍖', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['소고기'], desc: '단짠 양념에 부드러운 소고기가 조화로운 불고기' },
  { name: '닭갈비', emoji: '🐔', category: '한식', base: 'meat', soup: false, spicy: 2, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['닭고기'], desc: '철판에 볶아 매콤달콤 쫄깃한 닭고기 요리' },
  { name: '삼계탕', emoji: '🐔🍲', category: '한식', base: 'meat', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['닭고기'], desc: '인삼과 대추를 넣어 푹 고아낸 보양식' },
  { name: '칼국수', emoji: '🍜', category: '한식', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '진한 멸치 육수에 손맛이 살아있는 손칼국수' },
  { name: '갈비탕', emoji: '🥣🥩', category: '한식', base: 'meat', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['소고기'], desc: '두툼한 갈빗대와 맑고 깊은 고기 육수의 조화' },
  { name: '순대국밥', emoji: '🍲', category: '한식', base: 'rice', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['돼지고기'], desc: '들깨가루 듬뿍, 잡내 없이 구수한 순대국밥' },
  { name: '족발', emoji: '🐖', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'cold', weight: 'heavy', price: 'high', serving: 'both', party: 'group', avoidTags: ['돼지고기'], desc: '쫀득하고 야들야들한 콜라겐 가득 족발' },
  { name: '보쌈', emoji: '🥩🥬', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'both', party: 'group', avoidTags: ['돼지고기'], desc: '기름기를 쏙 빼서 야들야들 담백한 수육 보쌈' },
  { name: '물냉면', emoji: '🍜🧊', category: '한식', base: 'noodle', soup: true, spicy: 0, temperature: 'cold', weight: 'light', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '오이', '메밀', '소고기', '달걀'], desc: '살얼음 동동 새콤한 육수에 쫄깃한 면발' },
  { name: '비빔냉면', emoji: '🍜🌶️', category: '한식', base: 'noodle', soup: false, spicy: 2, temperature: 'cold', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '오이', '메밀', '달걀'], desc: '새콤달콤 매콤한 양념에 비벼 먹는 시원한 냉면' },
  { name: '감자탕', emoji: '🦴🥔', category: '한식', base: 'meat', soup: true, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['돼지고기'], desc: '푹 고아낸 돼지 등뼈와 포슬포슬 감자가 든 얼큰한 탕' },
  { name: '부대찌개', emoji: '🍲🌭', category: '한식', base: 'rice', soup: true, spicy: 2, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루', '돼지고기', '유제품'], desc: '햄·소시지·라면사리가 듬뿍 들어간 얼큰한 찌개' },
  { name: '순두부찌개', emoji: '🥘🔥', category: '한식', base: 'rice', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['해산물', '달걀'], desc: '몽글몽글 순두부와 바지락이 든 칼칼한 찌개' },
  { name: '찜닭', emoji: '🍗🥘', category: '한식', base: 'meat', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['닭고기'], desc: '간장 양념에 닭과 당면을 졸여낸 달짝지근한 찜' },
  { name: '치킨', emoji: '🍗', category: '한식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루', '닭고기'], desc: '겉은 바삭 속은 촉촉한 국민 야식' },
  { name: '쭈꾸미볶음', emoji: '🐙🔥', category: '한식', base: 'rice', soup: false, spicy: 3, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['해산물'], desc: '불맛 가득 매운 양념에 볶아낸 쫄깃한 쭈꾸미' },

  // --- 중식 (15종) ---
  { name: '짜장면', emoji: '🍜', category: '중식', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '돼지고기'], desc: '달콤 짭조름한 국민 중식 면요리' },
  { name: '짬뽕', emoji: '🌶️🍜', category: '중식', base: 'noodle', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물', '갑각류'], desc: '얼큰한 국물과 풍성한 해산물의 조화' },
  { name: '탕수육', emoji: '🐖🥢', category: '중식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루', '돼지고기', '달걀'], desc: '바삭하게 튀겨 달콤 새콤 소스를 끼얹은 고기' },
  { name: '마라탕', emoji: '🍲🌶️', category: '중식', base: 'etc', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '중독성 강한 매콤 알싸한 사천식 국물탕' },
  { name: '마라샹궈', emoji: '🥘🌶️', category: '중식', base: 'etc', soup: false, spicy: 2, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물'], desc: '알싸한 마라 양념에 다양한 재료를 볶아낸 요리' },
  { name: '볶음밥', emoji: '🍚🇨🇳', category: '중식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['달걀'], desc: '고슬고슬 불맛 가득 볶아낸 정통 중식 볶음밥' },
  { name: '양장피', emoji: '🥗🇨🇳', category: '중식', base: 'etc', soup: false, spicy: 1, temperature: 'cold', weight: 'normal', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['해산물', '오이', '갑각류', '달걀'], desc: '겨자 소스 톡 쏘는 다채로운 해산물 잡채 요리' },
  { name: '깐풍기', emoji: '🐔🇨🇳', category: '중식', base: 'meat', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루', '닭고기', '달걀'], desc: '매콤달콤 깐풍 소스에 볶아낸 바삭한 닭고기' },
  { name: '동파육', emoji: '🥩🇨🇳', category: '중식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['돼지고기'], desc: '입안에서 녹아내리는 극상의 부드러운 오겹살찜' },
  { name: '어향가지', emoji: '🍆', category: '중식', base: 'etc', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['가지', '밀가루', '돼지고기'], desc: '어향 소스로 감칠맛을 극대화한 촉촉한 가지 튀김' },
  { name: '지삼선', emoji: '🥔🍆', category: '중식', base: 'etc', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['가지', '밀가루'], desc: '땅에서 나는 세 가지 보물(감자, 피망, 가지) 볶음' },
  { name: '마파두부', emoji: '🫕🌶️', category: '중식', base: 'rice', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['돼지고기'], desc: '얼얼한 두반장 소스에 부드러운 두부를 볶아 밥에 얹은 요리' },
  { name: '유린기', emoji: '🐔🥬', category: '중식', base: 'meat', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루', '닭고기', '달걀'], desc: '바삭한 닭튀김에 새콤한 간장 소스와 채소를 올린 요리' },
  { name: '훠궈', emoji: '🍲🔥', category: '중식', base: 'etc', soup: true, spicy: 2, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['해산물'], desc: '얼얼한 마라 육수에 고기와 채소를 데쳐 먹는 중국식 샤브샤브' },
  { name: '딤섬', emoji: '🥟🇨🇳', category: '중식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['밀가루', '해산물', '갑각류', '돼지고기'], desc: '얇은 피 속에 새우·고기를 담아 쪄낸 한입 만두' },

  // --- 일식 (16종) ---
  { name: '돈까스', emoji: '🍛', category: '일식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '돼지고기', '달걀'], desc: '바삭바삭한 튀김옷과 두툼한 등심의 만남' },
  { name: '초밥', emoji: '🍣', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'cold', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것', '갑각류'], desc: '신선한 횟감과 알맞게 쥔 밥의 예술' },
  { name: '라멘', emoji: '🍜🇯🇵', category: '일식', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '돼지고기', '달걀'], desc: '진한 돈사골 육수와 부드러운 차슈의 조화' },
  { name: '우동', emoji: '🍲🇯🇵', category: '일식', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루'], desc: '가쓰오부시 국물에 오동통한 면발이 맛있는 우동' },
  { name: '메밀소바', emoji: '🧊🍜', category: '일식', base: 'noodle', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['메밀'], desc: '살얼음 둥둥 쯔유 소스에 적셔 먹는 시원한 소바' },
  { name: '규동', emoji: '🍚🇯🇵', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['소고기'], desc: '달콤한 소스에 소고기와 양파를 졸여 올린 덮밥' },
  { name: '텐동', emoji: '🍤🍚', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '해산물', '갑각류', '달걀'], desc: '바삭한 해산물/채소 튀김이 한가득 올라간 튀김덮밥' },
  { name: '회덮밥', emoji: '🐟🍚', category: '일식', base: 'rice', soup: false, spicy: 2, temperature: 'cold', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것'], desc: '신선한 활어회와 야채를 초고추장에 비벼먹는 밥' },
  { name: '일식 카레', emoji: '🍛🇯🇵', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '유제품'], desc: '오랜 시간 뭉근하게 끓여 부드럽고 진한 숙성 카레' },
  { name: '야키소바', emoji: '🍝🇯🇵', category: '일식', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '돼지고기'], desc: '단짠 소스에 고기와 야채를 함께 볶아낸 면요리' },
  { name: '타코야끼', emoji: '🐙🔴', category: '일식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'light', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물', '달걀'], desc: '쫄깃쫄깃 문어가 콕 박힌 오사카 정통 길거리 간식' },
  { name: '사시미', emoji: '🐟🥢', category: '일식', base: 'etc', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['해산물', '날것'], desc: '신선한 원어를 정성스레 썰어낸 극상의 깔끔함' },
  { name: '오코노미야끼', emoji: '🥞🇯🇵', category: '일식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '해산물', '돼지고기', '달걀'], desc: '양배추와 해물을 듬뿍 넣어 철판에 구운 일본식 부침개' },
  { name: '가츠동', emoji: '🍛🥚', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '돼지고기', '달걀'], desc: '돈까스를 달콤한 소스와 계란으로 덮은 덮밥' },
  { name: '사케동', emoji: '🍣🍚', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'cold', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것'], desc: '두툼한 생연어를 밥 위에 가득 올린 연어덮밥' },
  { name: '오야코동', emoji: '🐔🍚', category: '일식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['닭고기', '달걀'], desc: '닭고기와 계란을 달짝지근하게 졸여 올린 덮밥' },

  // --- 양식 (16종) ---
  { name: '피자', emoji: '🍕', category: '양식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'both', party: 'group', avoidTags: ['밀가루', '유제품'], desc: '고소한 치즈가 듬뿍 토핑된 이탈리안 푸드' },
  { name: '햄버거', emoji: '🍔', category: '양식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '소고기', '달걀', '유제품'], desc: '두툼한 수제 패티와 신선한 채소의 완벽 조합' },
  { name: '파스타', emoji: '🍝', category: '양식', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '유제품'], desc: '부드러운 크림 또는 상큼한 토마토 소스 면요리' },
  { name: '스테이크', emoji: '🥩🍴', category: '양식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'dine_in', party: 'solo', avoidTags: ['소고기'], desc: '육즙을 꽉 잡아 입안에서 팡 튀는 그릴 스테이크' },
  { name: '리조또', emoji: '🍚🇮🇹', category: '양식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['유제품'], desc: '크림 또는 토마토 소스에 부드럽게 익힌 이탈리안 쌀요리' },
  { name: '연어 샐러드', emoji: '🥗🐟', category: '양식', base: 'etc', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것'], desc: '신선한 연어와 채소, 새콤달콤 드레싱의 만남' },
  { name: '샌드위치', emoji: '🥪', category: '양식', base: 'bread', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '달걀'], desc: '가벼운 식사 대용으로 아주 깔끔하고 신선한 토스트' },
  { name: '타코', emoji: '🌮', category: '양식', base: 'bread', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '고수', '유제품'], desc: '또띠아 위에 고기, 야채, 살사 소스를 듬뿍 올린 맥시칸 요리' },
  { name: '감바스', emoji: '🦐🫒', category: '양식', base: 'etc', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['해산물', '갑각류'], desc: '마늘 향 가득한 올리브유에 새우를 끓여 빵과 즐기는 요리' },
  { name: '닭가슴살 샐러드', emoji: '🥗🐔', category: '양식', base: 'etc', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['닭고기'], desc: '담백한 닭가슴살과 신선한 채소의 가벼운 한 끼' },
  { name: '함박스테이크', emoji: '🍖🍳', category: '양식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '소고기', '돼지고기', '달걀'], desc: '육즙 가득 다진 고기 패티에 데미글라스 소스를 끼얹은 요리' },
  { name: '부리또', emoji: '🌯', category: '양식', base: 'bread', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '고수', '유제품'], desc: '또띠아에 고기·밥·콩을 꽉 채워 말아낸 멕시칸 한 끼' },
  { name: '라자냐', emoji: '🍝🧀', category: '양식', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '유제품', '소고기'], desc: '넓은 면 사이사이 미트소스와 치즈를 겹겹이 구워낸 요리' },
  { name: '피쉬앤칩스', emoji: '🐟🍟', category: '양식', base: 'etc', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '바삭한 흰살생선 튀김과 감자튀김의 영국식 조합' },
  { name: '바베큐 립', emoji: '🍖🔥', category: '양식', base: 'meat', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['돼지고기'], desc: '달콤한 바베큐 소스를 발라 뼈째 뜯는 돼지 등갈비' },
  { name: '포케', emoji: '🥗🐟', category: '양식', base: 'rice', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '날것'], desc: '밥 위에 생연어·참치와 채소를 올린 하와이식 볼' },

  // --- 분식 (15종) ---
  { name: '떡볶이', emoji: '🍢', category: '분식', base: 'etc', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '달걀'], desc: '매콤달콤 쫄깃쫄깃 최고의 국민 분식 대장' },
  { name: '김밥', emoji: '🍙', category: '분식', base: 'rice', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'low', serving: 'both', party: 'solo', avoidTags: ['오이', '달걀'], desc: '든든하게 말아낸 한 줄의 행복' },
  { name: '라볶이', emoji: '🍜🍢', category: '분식', base: 'noodle', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '달걀'], desc: '떡볶이 양념에 라면사리를 넣은 분식집 인기 메뉴' },
  { name: '순대', emoji: '🌭', category: '분식', base: 'etc', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['돼지고기'], desc: '쫄깃한 순대를 소금이나 막장에 콕 찍어 먹는 맛' },
  { name: '모둠튀김', emoji: '🍤', category: '분식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '김말이·오징어·야채 튀김을 바삭하게 한 접시' },
  { name: '라면', emoji: '🍜', category: '분식', base: 'noodle', soup: true, spicy: 2, temperature: 'hot', weight: 'normal', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '달걀'], desc: '분식집에서 끓여주는 꼬들꼬들 얼큰한 라면' },
  { name: '쫄면', emoji: '🍜🥒', category: '분식', base: 'noodle', soup: false, spicy: 2, temperature: 'cold', weight: 'normal', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '오이', '달걀'], desc: '쫄깃한 면발에 새콤매콤 양념과 채소를 비빈 면' },
  { name: '만두', emoji: '🥟', category: '분식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '돼지고기'], desc: '육즙 가득 고기·김치 소를 채운 찐만두와 군만두' },
  { name: '오므라이스', emoji: '🍳🍚', category: '분식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['달걀'], desc: '볶음밥을 부드러운 계란으로 감싼 달콤한 한 접시' },
  { name: '어묵탕', emoji: '🍢🍲', category: '분식', base: 'etc', soup: true, spicy: 0, temperature: 'hot', weight: 'light', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '해산물'], desc: '뜨끈한 국물에 꼬치 어묵을 담가 먹는 겨울 간식' },
  { name: '잔치국수', emoji: '🍜🥚', category: '분식', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'light', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '달걀'], desc: '맑은 멸치 육수에 소면을 말아낸 담백한 국수' },
  { name: '비빔국수', emoji: '🍜🌶️', category: '분식', base: 'noodle', soup: false, spicy: 2, temperature: 'cold', weight: 'normal', price: 'low', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '오이', '달걀'], desc: '새콤매콤 양념에 소면을 비벼낸 시원한 국수' },
  { name: '로제떡볶이', emoji: '🍢🧀', category: '분식', base: 'etc', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'delivery', party: 'group', avoidTags: ['밀가루', '유제품'], desc: '크림과 고추장을 섞은 부드럽고 꾸덕한 배달 떡볶이' },
  { name: '핫도그', emoji: '🌭🥖', category: '분식', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'light', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '돼지고기', '달걀'], desc: '설탕과 케첩을 듬뿍 뿌린 바삭쫄깃 분식 핫도그' },
  { name: '참치마요덮밥', emoji: '🍚🐟', category: '분식', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'low', serving: 'both', party: 'solo', avoidTags: ['해산물', '달걀'], desc: '고소한 참치마요와 김가루를 올린 간편 덮밥' },

  // --- 아시안 (16종) ---
  { name: '쌀국수', emoji: '🍜🇻🇳', category: '아시안', base: 'noodle', soup: true, spicy: 0, temperature: 'hot', weight: 'light', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['소고기', '고수'], desc: '맑고 담백한 소고기 육수와 향긋한 베트남식 면' },
  { name: '팟타이', emoji: '🍝🇹🇭', category: '아시안', base: 'noodle', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '갑각류', '견과류', '달걀'], desc: '새콤달콤한 소스에 새우와 두부를 볶아낸 태국식 볶음면' },
  { name: '똠양꿍', emoji: '🍲🌶️🇹🇭', category: '아시안', base: 'etc', soup: true, spicy: 2, temperature: 'hot', weight: 'light', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['해산물', '갑각류', '고수'], desc: '세계 3대 스프, 매콤새콤 신비로운 태국식 새우 스프' },
  { name: '나시고랭', emoji: '🍛🇮🇩', category: '아시안', base: 'rice', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '갑각류', '달걀'], desc: '단짠 소스에 해산물을 넣고 고슬고슬 볶아낸 인도네시아 볶음밥' },
  { name: '분짜', emoji: '🍜🥢', category: '아시안', base: 'noodle', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['돼지고기', '고수'], desc: '숯불 돼지고기와 쌀국수를 새콤달콤 소스에 적셔 먹는 베트남 요리' },
  { name: '반미', emoji: '🥖🇻🇳', category: '아시안', base: 'bread', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'low', serving: 'both', party: 'solo', avoidTags: ['밀가루', '오이', '돼지고기', '고수'], desc: '바삭한 바게트에 고기와 채소 절임을 넣은 베트남 샌드위치' },
  { name: '월남쌈', emoji: '🌯🥬', category: '아시안', base: 'etc', soup: false, spicy: 0, temperature: 'cold', weight: 'light', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['해산물', '오이', '갑각류'], desc: '라이스페이퍼에 채소와 새우를 싸 먹는 산뜻한 요리' },
  { name: '카오팟', emoji: '🍚🇹🇭', category: '아시안', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['해산물', '갑각류', '달걀'], desc: '새우와 계란을 넣고 고슬하게 볶은 태국식 볶음밥' },
  { name: '그린커리', emoji: '🍛🥥', category: '아시안', base: 'rice', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['가지'], desc: '코코넛 밀크에 매콤한 그린 페이스트를 푼 태국 커리' },
  { name: '푸팟퐁커리', emoji: '🦀🍛', category: '아시안', base: 'rice', soup: false, spicy: 0, temperature: 'hot', weight: 'heavy', price: 'high', serving: 'dine_in', party: 'group', avoidTags: ['해산물', '밀가루', '갑각류', '달걀'], desc: '튀긴 소프트쉘 크랩을 부드러운 계란 커리로 볶은 태국 요리' },
  { name: '커리와 난', emoji: '🍛🫓', category: '아시안', base: 'bread', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['밀가루', '유제품'], desc: '진한 인도 커리를 갓 구운 쫄깃한 난에 찍어 먹는 한 끼' },
  { name: '탄두리 치킨', emoji: '🍗🇮🇳', category: '아시안', base: 'meat', soup: false, spicy: 1, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'group', avoidTags: ['닭고기', '유제품'], desc: '요거트와 향신료에 재운 닭을 화덕에 구운 인도 요리' },
  { name: '미고랭', emoji: '🍝🇮🇩', category: '아시안', base: 'noodle', soup: false, spicy: 1, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['밀가루', '해산물', '달걀'], desc: '달짝지근한 간장 소스에 볶아낸 인도네시아식 볶음면' },
  { name: '팟카파오', emoji: '🍚🌿', category: '아시안', base: 'rice', soup: false, spicy: 2, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'both', party: 'solo', avoidTags: ['달걀'], desc: '바질 향 가득 매콤하게 볶은 고기에 계란 프라이를 올린 덮밥' },
  { name: '락사', emoji: '🍜🥥', category: '아시안', base: 'noodle', soup: true, spicy: 2, temperature: 'hot', weight: 'heavy', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['해산물', '갑각류'], desc: '코코넛 커리 국물에 새우와 쌀국수를 넣은 싱가포르 국수' },
  { name: '반쎄오', emoji: '🥞🇻🇳', category: '아시안', base: 'bread', soup: false, spicy: 0, temperature: 'hot', weight: 'normal', price: 'mid', serving: 'dine_in', party: 'solo', avoidTags: ['해산물', '갑각류', '돼지고기'], desc: '쌀가루 반죽에 새우·숙주를 넣어 바삭하게 부친 베트남 부침개' },
];
