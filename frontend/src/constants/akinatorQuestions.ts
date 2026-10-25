import { MenuItem } from './menuData';

export interface MenuProperty {
  id: string;
  text: string;
  check: (item: MenuItem) => boolean;
}

export const AKINATOR_PROPERTIES: MenuProperty[] = [
  { id: 'isNoodle', text: '면 요리는 어떠신가요?', check: item => item.style === 'noodle' },
  { id: 'isRice', text: '밥 요리는 어떠신가요?', check: item => item.style === 'rice' },
  { id: 'isMeat', text: '고기 요리는 어떠신가요?', check: item => item.style === 'meat' },
  { id: 'isBread', text: '빵이나 밀가루가 들어간 요리는 어떠신가요?', check: item => item.style === 'bread' },
  { id: 'isCold', text: '시원하거나 차가운 음식은 어떠신가요?', check: item => item.temperature === 'cold' },
  { id: 'isSpicy', text: '매운 음식은 어떠신가요?', check: item => item.spicy === true },
  { 
    id: 'hasSoup', 
    text: '국물 요리는 어떠신가요?', 
    check: item => ['김치찌개', '된장찌개', '육개장', '삼계탕', '갈비탕', '순대국밥', '짬뽕', '마라탕', '우동', '쌀국수', '똠양꿍'].includes(item.name) 
  },
  { 
    id: 'hasCheese', 
    text: '치즈나 크림이 들어간 요리는 어떠신가요?', 
    check: item => ['피자', '햄버거', '파스타', '리조또'].includes(item.name) 
  },
  { 
    id: 'isRaw', 
    text: '날것(회, 초밥 등) 요리는 어떠신가요?', 
    check: item => ['초밥', '회덮밥', '사시미'].includes(item.name) 
  },
  { 
    id: 'isSnack', 
    text: '분식이나 간식 종류는 어떠신가요?', 
    check: item => ['떡볶이', '타코야끼', '샌드위치', '타코', '햄버거'].includes(item.name) 
  }
];
