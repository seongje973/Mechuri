import { MenuItem, SPICY_TAG_LEVEL } from '../constants/menuData';
import { SIMILAR_MIN_SHARED } from './config';

/** 나라·주재료·국물·맵기(매운지)·온도·무게 중 같은 것의 수 (0~6) */
export const sharedTraits = (a: MenuItem, b: MenuItem): number =>
  [
    a.category === b.category,
    a.base === b.base,
    a.soup === b.soup,
    a.spicy >= SPICY_TAG_LEVEL === b.spicy >= SPICY_TAG_LEVEL,
    a.temperature === b.temperature,
    a.weight === b.weight,
  ].filter(Boolean).length;

/** 김치찌개와 된장찌개처럼 거의 같은 종류의 메뉴인지 */
export const isSimilarMenu = (a: MenuItem, b: MenuItem): boolean => sharedTraits(a, b) >= SIMILAR_MIN_SHARED;
