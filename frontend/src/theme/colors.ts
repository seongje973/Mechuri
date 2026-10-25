/** 디자인 시안(크림 테마)의 색. 화면을 새 테마로 옮길 때 여기 값을 쓴다 */
export const colors = {
  cream: '#FFF7EC',
  surface: '#FFFFFF',
  shell: '#F3E4CC',
  line: '#EAD9C0',
  ink: '#2E2219',
  muted: '#75604F',
  yolk: '#F5A623',
  yolkDeep: '#D98A0B',
  /** 이유 태그 배경 (노른자 연한 톤) */
  yolkSoft: '#FDE7BF',
  quail: '#B07A4A',
  feather: '#8A5A32',
  blush: '#F28B6B',
  leaf: '#2F7A55',
  chili: '#C2412D',
  /** 기피 태그 배경과 글자 (칠리 연한 톤) */
  chiliSoft: '#FBE3DD',
  chiliText: '#9E2F1F',
  kakao: '#FEE500',
  scrim: 'rgba(46, 34, 25, 0.45)',
} as const;

export type ColorName = keyof typeof colors;
export type Palette = Record<ColorName, string>;

/**
 * 다크 모드: 같은 이름에 값만 바꾼다. 노른자는 두 모드 모두 그대로.
 * cream/surface/shell/ink/muted는 디자인 가이드 값, 나머지는 가이드에 없어 대비를 맞춰 정했다.
 */
export const darkColors: Palette = {
  ...colors,
  cream: '#1F1813',
  surface: '#2B221B',
  shell: '#3A2E24',
  line: '#4A3B2E',
  ink: '#F7EDE0',
  muted: '#C9B5A0',
  yolkSoft: '#4A3A1E',
  feather: '#D9A877',
  leaf: '#5BB386',
  chili: '#E5735E',
  chiliSoft: '#4A2620',
  chiliText: '#F2A493',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** 모서리: 칩·입력 12, 버튼 16, 카드 24, 태그 full */
export const radii = { sm: 12, md: 16, lg: 24, full: 999 } as const;
