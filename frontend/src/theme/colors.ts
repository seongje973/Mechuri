/**
 * 테마색 후보. 디자인 시안 캔버스의 "G. 조합안" 보드에서 눌러 본 7가지와 같다.
 * 앱 전체 테마색은 아래 BRAND 한 줄만 바꾸면 된다.
 * brand 위 글자는 흰색(onBrand)이라 brand는 흰 글자와 4.5:1 이상 대비가 나야 한다.
 */
export const brandThemes = {
  tomato: { brand: '#D9362B', brandDeep: '#B02A20', brandSoft: '#FFE8E5', brandText: '#A82A20', brandMid: '#EC8A80' },
  tangerine: { brand: '#C9500A', brandDeep: '#9A3D06', brandSoft: '#FFEDE0', brandText: '#9A3D06', brandMid: '#EC9A64' },
  quail: { brand: '#8A5A32', brandDeep: '#6E4626', brandSoft: '#F5EADF', brandText: '#6E4626', brandMid: '#C4A080' },
  herb: { brand: '#0A7D5E', brandDeep: '#06624A', brandSoft: '#E3F4EE', brandText: '#06624A', brandMid: '#6CC0A6' },
  cobalt: { brand: '#2D5BFF', brandDeep: '#1C3FCC', brandSoft: '#EEF2FF', brandText: '#1C3FCC', brandMid: '#93A9FF' },
  plum: { brand: '#7B3FE4', brandDeep: '#5B2AB5', brandSoft: '#F1EAFD', brandText: '#5B2AB5', brandMid: '#B79AF0' },
  charcoal: { brand: '#1F2329', brandDeep: '#000000', brandSoft: '#FFF4CC', brandText: '#6B5300', brandMid: '#9AA0A8' },
} as const;

export type BrandThemeName = keyof typeof brandThemes;

/** 지금 쓰는 테마색. 바꾸려면 이 이름만 고친다 */
export const BRAND: BrandThemeName = 'tomato';

/** 디자인 시안(최종 조합안)의 색. 회색 바탕 + 흰 카드 + 테마색 하나 */
export const colors = {
  ...brandThemes[BRAND],
  /** brand 면 위의 글자와 아이콘 */
  onBrand: '#FFFFFF',
  /** 앱 기본 배경 (연한 회색) */
  bg: '#F2F4F6',
  /** 카드, 흰 버튼 */
  surface: '#FFFFFF',
  /** 보조 면: 칩 배경, 사진 자리, 흰 카드 안의 회색 상자 */
  fill: '#F2F4F6',
  /** 구분선, 테두리 */
  line: '#E5E8EB',
  /** 버튼 테두리처럼 조금 더 진한 선 */
  lineStrong: '#D1D6DB',
  /** 본문·제목 글자 */
  ink: '#191F28',
  /** 보조 글자 (흰 바탕 4.7:1) */
  muted: '#6B7684',
  /** 아이콘, 덜 중요한 글자 */
  subtle: '#4E5968',
  /** 꺼진 탭, 화살표처럼 글자가 아닌 장식 */
  faint: '#8B95A1',
  /** 마스코트 몸통, 일러스트 */
  quail: '#C98A52',
  quailDark: '#5A3A20',
  beak: '#FFC93C',
  blush: '#FF9C8C',
  leaf: '#0A7D5E',
  chili: '#C2412D',
  /** 기피 태그(못 먹는 음식) 배경과 글자 */
  chiliSoft: '#FDECEC',
  chiliText: '#A1281F',
  /** 별점 */
  star: '#C98A00',
  kakao: '#FEE500',
  kakaoText: '#191919',
  scrim: 'rgba(25, 31, 40, 0.45)',
} as const;

export type ColorName = keyof typeof colors;
export type Palette = Record<ColorName, string>;

/**
 * 다크 모드: 같은 이름에 값만 바꾼다. 아직 앱은 라이트만 쓴다(app.json userInterfaceStyle: light).
 */
export const darkColors: Palette = {
  ...colors,
  bg: '#101317',
  surface: '#1B1F24',
  fill: '#262B31',
  line: '#2F353C',
  lineStrong: '#3D444C',
  ink: '#F2F4F6',
  muted: '#A3ACB7',
  subtle: '#C1C8D0',
  faint: '#7D8691',
  brandSoft: '#3A2220',
  brandText: '#F2A493',
  chiliSoft: '#4A2620',
  chiliText: '#F2A493',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** 모서리: 칩 8, 입력·작은 버튼 12, 버튼 16, 카드 24, 태그 full */
export const radii = { xs: 8, sm: 12, md: 16, lg: 24, full: 999 } as const;
