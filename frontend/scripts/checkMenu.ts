/**
 * 메뉴 데이터 검사 (npm run check:menu). 기준은 docs/menu-attributes.md.
 * - error: 누락·이상값·중복. 하나라도 있으면 실패(exit 1)
 * - warning: 기준표상 어색한 조합. 사람이 한 번 확인하면 되는 것
 */
import { MENU_DATA, CUISINES, MenuItem, AVOID_TAG_OPTIONS } from '../src/constants/menuData';

export const MIN_MENUS = 100;
export const MIN_PER_CUISINE = 8;

const ALLOWED: Record<string, readonly unknown[]> = {
  base: ['rice', 'noodle', 'bread', 'meat', 'etc'],
  spicy: [0, 1, 2, 3],
  temperature: ['hot', 'cold'],
  weight: ['light', 'normal', 'heavy'],
  price: ['low', 'mid', 'high'],
  serving: ['dine_in', 'delivery', 'both'],
  party: ['solo', 'group'],
};
const AVOID_TAGS: string[] = AVOID_TAG_OPTIONS.filter(tag => tag !== '매운맛');
/** 면·반죽이지만 밀가루가 없는 메뉴 (쌀국수류, 순메밀, 쌀가루 반죽). 기준표 10번 */
const WHEAT_FREE = ['쌀국수', '팟타이', '메밀소바', '분짜', '락사', '반쎄오'];

export interface MenuIssue {
  level: 'error' | 'warning';
  menu: string;
  message: string;
}

export const checkMenu = (data: MenuItem[] = MENU_DATA): MenuIssue[] => {
  const issues: MenuIssue[] = [];
  const error = (menu: string, message: string) => issues.push({ level: 'error', menu, message });
  const warn = (menu: string, message: string) => issues.push({ level: 'warning', menu, message });

  data.forEach((item, i) => {
    const menu = item.name || `#${i + 1}`;
    for (const key of ['name', 'emoji', 'desc'] as const) {
      if (typeof item[key] !== 'string' || item[key].trim() === '') error(menu, `${key}가 비어 있음`);
    }
    if (!CUISINES.includes(item.category)) error(menu, `category '${item.category}'는 나라별 6가지에 없음`);
    for (const [key, values] of Object.entries(ALLOWED)) {
      const value = (item as unknown as Record<string, unknown>)[key];
      if (!values.includes(value)) error(menu, `${key} '${String(value)}'는 허용값(${values.join(', ')})이 아님`);
    }
    if (typeof item.soup !== 'boolean') error(menu, 'soup는 true/false여야 함');
    if (!Array.isArray(item.avoidTags)) {
      error(menu, 'avoidTags가 배열이 아님');
    } else {
      item.avoidTags.forEach(tag => {
        if ((tag as string) === '매운맛') error(menu, "'매운맛'은 맵기에서 자동으로 붙으므로 avoidTags에 넣지 않음");
        else if (!AVOID_TAGS.includes(tag)) error(menu, `기피 태그 '${tag}'는 기준표에 없음`);
      });
      if (new Set(item.avoidTags).size !== item.avoidTags.length) error(menu, 'avoidTags에 같은 태그가 두 번 있음');

      const tags = item.avoidTags as string[];
      if (tags.includes('날것') && item.temperature === 'hot') warn(menu, "'날것'인데 온도가 hot");
      if (tags.includes('갑각류') && !tags.includes('해산물')) error(menu, "'갑각류'는 해산물이므로 '해산물'도 붙여야 함");
      if ((item.base === 'noodle' || item.base === 'bread') && !tags.includes('밀가루') && !WHEAT_FREE.includes(item.name)) {
        warn(menu, "면·반죽 요리인데 '밀가루' 태그가 없음 (밀가루가 없는 메뉴면 WHEAT_FREE에 추가)");
      }
    }
  });

  const seen = new Set<string>();
  data.forEach(item => {
    if (seen.has(item.name)) error(item.name, '메뉴 이름이 겹침');
    seen.add(item.name);
  });

  if (data.length < MIN_MENUS) error('(전체)', `메뉴가 ${data.length}개. ${MIN_MENUS}개 이상이어야 함`);
  CUISINES.forEach(cuisine => {
    const count = data.filter(m => m.category === cuisine).length;
    if (count < MIN_PER_CUISINE) error('(전체)', `${cuisine} 메뉴가 ${count}개. ${MIN_PER_CUISINE}개 이상이어야 함`);
  });

  return issues;
};

if (require.main === module) {
  const issues = checkMenu();
  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');
  issues.forEach(i => console.log(`${i.level === 'error' ? '✗' : '!'} ${i.menu}: ${i.message}`));

  const counts = CUISINES.map(c => `${c} ${MENU_DATA.filter(m => m.category === c).length}`).join(', ');
  console.log(`\n메뉴 ${MENU_DATA.length}개 (${counts})`);
  console.log(`오류 ${errors.length}개, 확인 필요 ${warnings.length}개`);
  process.exit(errors.length > 0 ? 1 : 0);
}
