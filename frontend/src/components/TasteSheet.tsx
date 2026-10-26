import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ALLERGY_TAG_OPTIONS, CUISINES, Cuisine, DISLIKE_TAG_OPTIONS } from '../constants/menuData';
import { EMPTY_PREFERENCES, SpicyPreference, TastePreferences } from '../engine/preferences';
import { getAvoidTags, getPreferences, setAvoidTags, setPreferences } from '../storage/userData';
import { colors, fonts, radii } from '../theme';

interface TasteSheetProps {
  visible: boolean;
  /** 'login': 로그인 직후 처음 묻기, 'edit': 마이페이지에서 고치기 */
  mode: 'login' | 'edit';
  onClose: () => void;
  /** 저장이 끝났을 때. 저장된 기피 태그와 취향을 넘긴다 */
  onSaved?: (avoidTags: string[], preferences: TastePreferences) => void;
}

const SPICY_OPTIONS: { value: SpicyPreference; label: string }[] = [
  { value: 'mild', label: '안 매운 게 좋아요' },
  { value: 'normal', label: '보통이에요' },
  { value: 'hot', label: '매운 거 좋아요' },
];

const COPY = {
  login: { title: '추리에게 입맛을 알려 줄래?', body: '알레르기와 안 먹는 음식은 추천에서 아예 빼고, 좋아하는 음식은 조금 더 자주 추천해요.' },
  edit: { title: '알레르기·취향 설정', body: '알레르기와 안 먹는 음식은 추천에서 아예 빼고, 좋아하는 음식은 조금 더 자주 추천해요.' },
};

/**
 * 알레르기·안 먹는 음식(기피 태그)과 취향(좋아하는 나라별 음식, 매운맛)을 한 번에 고르는 시트.
 * 게스트는 기기에, 로그인 사용자는 서버에 저장된다 (storage/userData).
 */
export default function TasteSheet({ visible, mode, onClose, onSaved }: TasteSheetProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<TastePreferences>(EMPTY_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // 저장된 값을 못 읽었으면 빈 값으로 덮어쓰지 않도록 저장을 막는다
  const [loadFailed, setLoadFailed] = useState(false);

  // 열 때마다 저장된 값을 다시 읽는다
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    setLoadFailed(false);
    Promise.allSettled([getAvoidTags(), getPreferences()]).then(([t, p]) => {
      if (!alive) return;
      setTags(t.status === 'fulfilled' ? t.value : []);
      setPrefs(p.status === 'fulfilled' && p.value ? p.value : EMPTY_PREFERENCES);
      setLoadFailed(t.status === 'rejected' || p.status === 'rejected');
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [visible]);

  const toggleTag = (tag: string) =>
    setTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));

  const toggleCuisine = (cuisine: Cuisine) =>
    setPrefs(prev => ({
      ...prev,
      likedCuisines: prev.likedCuisines.includes(cuisine)
        ? prev.likedCuisines.filter(c => c !== cuisine)
        : [...prev.likedCuisines, cuisine],
    }));

  const chooseSpicy = (spicy: SpicyPreference) =>
    setPrefs(prev => ({ ...prev, spicy: prev.spicy === spicy ? null : spicy }));

  const handleSave = async () => {
    setSaving(true);
    // 기피 태그만 저장되고 취향 저장이 실패하면 그렇다고 알려 준다. 다시 저장하면 둘 다 다시 보낸다
    let tagsSaved = false;
    try {
      const savedTags = await setAvoidTags(tags);
      tagsSaved = true;
      const savedPrefs = await setPreferences(prefs);
      onSaved?.(savedTags, savedPrefs);
      onClose();
    } catch (e) {
      Alert.alert(
        '저장하지 못했어요',
        tagsSaved
          ? '알레르기·안 먹는 음식은 저장했지만 좋아하는 음식은 저장하지 못했어요. 다시 시도해 주세요.'
          : '잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setSaving(false);
    }
  };

  const copy = COPY[mode];
  const spicyAvoided = tags.includes('매운맛');

  const renderChip = (label: string, on: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[styles.chip, on && styles.chipOn]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{on ? '✓ ' : ''}{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="닫기" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>

          {loading ? (
            <ActivityIndicator color={colors.yolkDeep} style={{ marginVertical: 24 }} />
          ) : loadFailed ? (
            <Text style={styles.error}>저장된 설정을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.</Text>
          ) : (
            <>
              <Text style={styles.label}>🚫 알레르기가 있어요</Text>
              <View style={styles.chipRow}>
                {ALLERGY_TAG_OPTIONS.map(tag => renderChip(tag, tags.includes(tag), () => toggleTag(tag)))}
              </View>
              <Text style={styles.note}>식당마다 재료가 달라요. 알레르기가 심하면 주문할 때 꼭 한 번 더 확인해 주세요.</Text>

              <Text style={styles.label}>🙅 안 먹어요</Text>
              <View style={styles.chipRow}>
                {DISLIKE_TAG_OPTIONS.map(tag => renderChip(tag, tags.includes(tag), () => toggleTag(tag)))}
              </View>

              <Text style={styles.label}>😋 좋아하는 음식</Text>
              <View style={styles.chipRow}>
                {CUISINES.map(c => renderChip(c, prefs.likedCuisines.includes(c), () => toggleCuisine(c)))}
              </View>

              {!spicyAvoided && (
                <>
                  <Text style={styles.label}>🌶️ 매운맛은</Text>
                  <View style={styles.chipRow}>
                    {SPICY_OPTIONS.map(o => renderChip(o.label, prefs.spicy === o.value, () => chooseSpicy(o.value)))}
                  </View>
                </>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, (saving || loading || loadFailed) && styles.disabled]}
            onPress={handleSave}
            disabled={saving || loading || loadFailed}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.saveText}>저장하기</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} disabled={saving} style={styles.laterBtn}>
            <Text style={styles.laterText}>{mode === 'login' ? '나중에 마이페이지에서 할게요' : '닫기'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.cream,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: 12,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: radii.full, backgroundColor: colors.line, marginBottom: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 36 },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, textAlign: 'center', marginBottom: 8 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 18, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.yolkSoft, borderColor: colors.yolkDeep },
  chipText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
  chipTextOn: { fontFamily: fonts.bold },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 8 },
  saveBtn: {
    marginTop: 26,
    backgroundColor: colors.yolk,
    borderRadius: radii.md,
    borderBottomWidth: 4,
    borderBottomColor: colors.yolkDeep,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  disabled: { opacity: 0.6 },
  error: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.chiliText, textAlign: 'center', marginVertical: 24 },
  laterBtn: { marginTop: 10, padding: 8, alignItems: 'center' },
  laterText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted },
});
