import { StyleSheet } from 'react-native';

/**
 * 같이 정하기 화면의 색. 디자인 시안(크림 테마) 값이며, src/theme가 생기면 그쪽으로 옮긴다.
 */
export const G = {
  cream: '#FFF7EC',
  surface: '#FFFFFF',
  shell: '#F3E4CC',
  line: '#EAD9C0',
  ink: '#2E2219',
  muted: '#75604F',
  yolk: '#F5A623',
  yolkDeep: '#D98A0B',
  quail: '#B07A4A',
  feather: '#8A5A32',
  blush: '#F28B6B',
  leaf: '#2F7A55',
  chili: '#C2412D',
};

export const gs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: G.cream },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: G.ink },
  subtitle: { fontSize: 14, color: G.muted, marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: G.surface, borderRadius: 16, borderWidth: 1, borderColor: G.line, padding: 16, marginTop: 16 },
  label: { fontSize: 13, fontWeight: '700', color: G.muted, marginBottom: 8 },
  input: {
    backgroundColor: G.surface, borderRadius: 12, borderWidth: 1, borderColor: G.line,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: G.ink,
  },
  primary: {
    backgroundColor: G.yolk, borderRadius: 16, borderBottomWidth: 4, borderBottomColor: G.yolkDeep,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  primaryText: { fontSize: 16, fontWeight: '800', color: G.ink },
  secondary: {
    backgroundColor: G.surface, borderRadius: 16, borderWidth: 1, borderColor: G.line, borderBottomWidth: 4,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  secondaryText: { fontSize: 16, fontWeight: '700', color: G.ink },
  disabled: { opacity: 0.45 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: G.line, backgroundColor: G.surface, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: G.shell, borderColor: G.quail },
  chipText: { fontSize: 13, color: G.ink },
  error: { color: G.chili, fontSize: 13, marginTop: 10 },
  mascot: { fontSize: 15, color: G.feather, fontWeight: '700', marginTop: 12 },
});
