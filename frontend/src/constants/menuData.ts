export interface MenuItem {
  name: string;
  emoji: string;
  category: '한식' | '중식' | '일식' | '양식';
  temperature: 'hot' | 'cold';
  spicy: boolean;
  style: 'rice' | 'noodle' | 'meat' | 'bread';
  desc: string;
  tags: string[]; // 알레르기/기피용 태그 매핑
}

export const MENU_DATA: MenuItem[] = [
  // --- 한식 (15종) ---
  { name: '김치찌개', emoji: '🍲', category: '한식', temperature: 'hot', spicy: true, style: 'rice', desc: '칼칼하고 얼큰한 한국인의 소울푸드', tags: ['매운맛'] },
  { name: '된장찌개', emoji: '🥘', category: '한식', temperature: 'hot', spicy: false, style: 'rice', desc: '구수하고 깊은 맛의 전통 찌개', tags: [] },
  { name: '삼겹살', emoji: '🥩', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '지글지글 구워 먹는 영원한 회식 1순위', tags: [] },
  { name: '제육볶음', emoji: '🐷', category: '한식', temperature: 'hot', spicy: true, style: 'meat', desc: '매콤한 양념에 불맛을 더한 고기 반찬의 왕', tags: ['매운맛'] },
  { name: '육개장', emoji: '🥣', category: '한식', temperature: 'hot', spicy: true, style: 'rice', desc: '얼큰한 국물 속에 소고기와 고사리가 가득', tags: ['매운맛'] },
  { name: '비빔밥', emoji: '🥗', category: '한식', temperature: 'cold', spicy: false, style: 'rice', desc: '다채로운 나물과 참기름 향 가득한 건강 한 끼', tags: [] },
  { name: '소불고기', emoji: '🍖', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '단짠 양념에 부드러운 소고기가 조화로운 불고기', tags: [] },
  { name: '닭갈비', emoji: '🐔', category: '한식', temperature: 'hot', spicy: true, style: 'meat', desc: '철판에 볶아 매콤달콤 쫄깃한 닭고기 요리', tags: ['매운맛'] },
  { name: '삼계탕', emoji: '🐔🍲', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '인삼 and 대추를 넣어 푹 고아낸 보양식', tags: [] },
  { name: '떡볶이', emoji: '🍢', category: '한식', temperature: 'hot', spicy: true, style: 'noodle', desc: '매콤달콤 쫄깃쫄깃 최고의 국민 분식 대장', tags: ['매운맛', '밀가루'] },
  { name: '칼국수', emoji: '🍜', category: '한식', temperature: 'hot', spicy: false, style: 'noodle', desc: '진한 멸치 육수에 손맛이 살아있는 손칼국수', tags: ['밀가루'] },
  { name: '갈비탕', emoji: '🥣🥩', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '두툼한 갈빗대와 맑고 깊은 고기 육수의 조화', tags: [] },
  { name: '순대국밥', emoji: '🍲', category: '한식', temperature: 'hot', spicy: false, style: 'rice', desc: '들깨가루 듬뿍, 잡내 없이 구수한 순대국밥', tags: [] },
  { name: '족발', emoji: '🐖', category: '한식', temperature: 'cold', spicy: false, style: 'meat', desc: '쫀득하고 야들야들한 콜라겐 가득 족발', tags: [] },
  { name: '보쌈', emoji: '🥩🥬', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '기름기를 쏙 빼서 야들야들 담백한 수육 보쌈', tags: [] },

  // --- 중식 (11종) ---
  { name: '짜장면', emoji: '🍜', category: '중식', temperature: 'hot', spicy: false, style: 'noodle', desc: '달콤 짭조름한 국민 중식 면요리', tags: ['밀가루'] },
  { name: '짬뽕', emoji: '🌶️🍜', category: '중식', temperature: 'hot', spicy: true, style: 'noodle', desc: '얼큰한 국물과 풍성한 해산물의 조화', tags: ['매운맛', '밀가루', '해산물'] },
  { name: '탕수육', emoji: '🐖🥢', category: '중식', temperature: 'hot', spicy: false, style: 'meat', desc: '바삭하게 튀겨 달콤 새콤 소스를 끼얹은 고기', tags: ['밀가루'] },
  { name: '마라탕', emoji: '🍲🌶️', category: '중식', temperature: 'hot', spicy: true, style: 'noodle', desc: '중독성 강한 매콤 알싸한 사천식 국물탕', tags: ['매운맛', '밀가루', '해산물'] },
  { name: '마라샹궈', emoji: '🥘🌶️', category: '중식', temperature: 'hot', spicy: true, style: 'meat', desc: '알싸한 마라 양념에 다양한 재료를 볶아낸 요리', tags: ['매운맛', '해산물'] },
  { name: '볶음밥', emoji: '🍚🇨🇳', category: '중식', temperature: 'hot', spicy: false, style: 'rice', desc: '고슬고슬 불맛 가득 볶아낸 정통 중식 볶음밥', tags: [] },
  { name: '양장피', emoji: '🥗🇨🇳', category: '중식', temperature: 'cold', spicy: false, style: 'meat', desc: '겨자 소스 톡 쏘는 다채로운 해산물 잡채 요리', tags: ['해산물'] },
  { name: '깐풍기', emoji: '🐔🇨🇳', category: '중식', temperature: 'hot', spicy: true, style: 'meat', desc: '매콤달콤 깐풍 소스에 볶아낸 바삭한 닭고기', tags: ['매운맛', '밀가루'] },
  { name: '동파육', emoji: '🥩🇨🇳', category: '중식', temperature: 'hot', spicy: false, style: 'meat', desc: '입안에서 녹아내리는 극상의 부드러운 오겹살찜', tags: [] },
  { name: '어향가지', emoji: '🍆', category: '중식', temperature: 'hot', spicy: true, style: 'rice', desc: '어향 소스로 감칠맛을 극대화한 촉촉한 가지 튀김', tags: ['가지', '매운맛', '밀가루'] },
  { name: '지삼선', emoji: '🥔🍆', category: '중식', temperature: 'hot', spicy: false, style: 'rice', desc: '땅에서 나는 세 가지 보물(감자, 피망, 가지) 볶음', tags: ['가지', '밀가루'] },

  // --- 일식 (12종) ---
  { name: '돈까스', emoji: '🍛', category: '일식', temperature: 'hot', spicy: false, style: 'meat', desc: '바삭바삭한 튀김옷 and 두툼한 등심의 만남', tags: ['밀가루'] },
  { name: '초밥', emoji: '🍣', category: '일식', temperature: 'cold', spicy: false, style: 'meat', desc: '신선한 횟감과 알맞게 쥔 밥의 예술', tags: ['해산물'] },
  { name: '라멘', emoji: '🍜🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'noodle', desc: '진한 돈사골 육수와 부드러운 차슈의 조화', tags: ['밀가루'] },
  { name: '우동', emoji: '🍲🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'noodle', desc: '가쓰오부시 국물에 오동통한 면발이 맛있는 우동', tags: ['밀가루'] },
  { name: '메밀소바', emoji: '🧊🍜', category: '일식', temperature: 'cold', spicy: false, style: 'noodle', desc: '살얼음 둥둥 쯔유 소스에 적셔 먹는 시원한 소바', tags: [] },
  { name: '규동', emoji: '🍚🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'rice', desc: '달콤한 소스에 소고기와 양파를 졸여 올린 덮밥', tags: [] },
  { name: '텐동', emoji: '🍤🍚', category: '일식', temperature: 'hot', spicy: false, style: 'rice', desc: '바삭한 해산물/채소 튀김이 한가득 올라간 튀김덮밥', tags: ['밀가루', '해산물'] },
  { name: '회덮밥', emoji: '🐟🍚', category: '일식', temperature: 'cold', spicy: true, style: 'rice', desc: '신선한 활어회와 야채를 초고추장에 비벼먹는 밥', tags: ['해산물', '매운맛'] },
  { name: '일식 카레', emoji: '🍛🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'rice', desc: '오랜 시간 뭉근하게 끓여 부드럽고 진한 숙성 카레', tags: [] },
  { name: '야키소바', emoji: '🍝🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'noodle', desc: '단짠 소스에 고기와 야채를 함께 볶아낸 면요리', tags: ['밀가루'] },
  { name: '타코야끼', emoji: '🐙🔴', category: '일식', temperature: 'hot', spicy: false, style: 'bread', desc: '쫄깃쫄깃 문어가 콕 박힌 오사카 정통 길거리 간식', tags: ['밀가루', '해산물'] },
  { name: '사시미', emoji: '🐟🥢', category: '일식', temperature: 'cold', spicy: false, style: 'meat', desc: '신선한 원어를 정성스레 썰어낸 극상의 깔끔함', tags: ['해산물'] },

  // --- 양식 및 기타 (12종) ---
  { name: '피자', emoji: '🍕', category: '양식', temperature: 'hot', spicy: false, style: 'bread', desc: '고소한 치즈가 듬뿍 토핑된 이탈리안 푸드', tags: ['밀가루'] },
  { name: '햄버거', emoji: '🍔', category: '양식', temperature: 'hot', spicy: false, style: 'bread', desc: '두툼한 수제 패티와 신선한 채소의 완벽 조합', tags: ['밀가루'] },
  { name: '파스타', emoji: '🍝', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '부드러운 크림 또는 상큼한 토마토 소스 면요리', tags: ['밀가루'] },
  { name: '스테이크', emoji: '🥩🍴', category: '양식', temperature: 'hot', spicy: false, style: 'meat', desc: '육즙을 꽉 잡아 입안에서 팡 튀는 그릴 스테이크', tags: [] },
  { name: '리조또', emoji: '🍚🇮🇹', category: '양식', temperature: 'hot', spicy: false, style: 'rice', desc: '크림 또는 토마토 소스에 부드럽게 익힌 이탈리안 쌀요리', tags: [] },
  { name: '연어 샐러드', emoji: '🥗🐟', category: '양식', temperature: 'cold', spicy: false, style: 'bread', desc: '신선한 연어와 채소, 새콤달콤 드레싱의 만남', tags: ['해산물'] },
  { name: '샌드위치', emoji: '🥪', category: '양식', temperature: 'cold', spicy: false, style: 'bread', desc: '가벼운 식사 대용으로 아주 깔끔하고 신선한 토스트', tags: ['밀가루'] },
  { name: '타코', emoji: '🌮', category: '양식', temperature: 'hot', spicy: true, style: 'bread', desc: '또띠아 위에 고기, 야채, 살사 소스를 듬뿍 올린 맥시칸 요리', tags: ['매운맛', '밀가루'] },
  { name: '쌀국수', emoji: '🍜🇻🇳', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '맑고 담백한 소고기 육수와 향긋한 베트남식 면', tags: [] },
  { name: '팟타이', emoji: '🍝🇹🇭', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '새콤달콤한 소스에 새우와 두부를 볶아낸 태국식 볶음면', tags: ['해산물'] },
  { name: '똠양꿍', emoji: '🍲🌶️🇹🇭', category: '양식', temperature: 'hot', spicy: true, style: 'noodle', desc: '세계 3대 스프, 매콤새콤 신비로운 태국식 새우 스프', tags: ['매운맛', '해산물'] },
  { name: '나시고랭', emoji: '🍛🇮🇩', category: '양식', temperature: 'hot', spicy: false, style: 'rice', desc: '단짠 소스에 해산물을 넣고 고슬고슬 볶아낸 인도네시아 볶음밥', tags: ['해산물'] }
];
