import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { devKakaoLogin, openKakaoLogin } from '../api/kakaoLogin';
import { saveSession } from '../api/client';
import { LoginPromptReason } from '../storage/loginPrompt';
import { colors, fonts, radii } from '../theme';

interface LoginSheetProps {
  visible: boolean;
  reason: LoginPromptReason;
  /** "나중에" 또는 바깥을 눌러 닫음. 7일 동안 다시 묻지 않는다 */
  onDismiss: () => void;
  /** 카카오 로그인 페이지로 넘어가서 시트만 닫음 (다시 묻지 않기는 하지 않음) */
  onClose: () => void;
  /** 개발용 간편 로그인으로 세션을 저장했을 때. 카카오 로그인은 딥링크로 돌아오므로 여기로 오지 않는다 */
  onLoggedIn: () => void;
}

const COPY: Record<LoginPromptReason, { title: string; body: string }> = {
  mypage: {
    title: '기록을 카카오에 저장해 둘까?',
    body: '지금 기록은 이 폰에만 있어요. 로그인하면 다른 폰에서도 그대로 볼 수 있어요.',
  },
  favorite: {
    title: '최애가 벌써 3개야!',
    body: '폰을 바꿔도 최애 메뉴가 남도록 카카오로 저장해 두세요. 지금까지 기록도 함께 옮겨져요.',
  },
};

export default function LoginSheet({ visible, reason, onDismiss, onClose, onLoggedIn }: LoginSheetProps) {
  const [busy, setBusy] = useState(false);
  const copy = COPY[reason];

  const handleKakao = async () => {
    setBusy(true);
    try {
      await openKakaoLogin();
      onClose();
    } catch (e) {
      Alert.alert('카카오 로그인을 열 수 없어요', '잠시 후 다시 시도해 주세요. 로그인 없이도 기록은 이 폰에 저장돼요.');
    } finally {
      setBusy(false);
    }
  };

  const handleDevLogin = async () => {
    setBusy(true);
    try {
      const { token, user } = await devKakaoLogin();
      await saveSession(token, user);
      onLoggedIn();
    } catch (e) {
      Alert.alert('연결 실패 📡', '서버에 연결하지 못했습니다. 기록은 이 폰에 그대로 남아 있어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} accessibilityLabel="닫기" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.mascot}>🐣</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        <TouchableOpacity style={styles.kakaoBtn} onPress={handleKakao} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.kakaoText}>💛 카카오로 저장하기</Text>}
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity onPress={handleDevLogin} disabled={busy} style={styles.devBtn}>
            <Text style={styles.devText}>개발용 간편 로그인 ➔</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onDismiss} disabled={busy} style={styles.laterBtn}>
          <Text style={styles.laterText}>나중에 할게요 (7일 동안 묻지 않기)</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  grabber: { width: 44, height: 5, borderRadius: radii.full, backgroundColor: colors.line, marginBottom: 16 },
  mascot: { fontSize: 44, marginBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, textAlign: 'center', marginBottom: 8 },
  body: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 22, color: colors.muted, textAlign: 'center', marginBottom: 22 },
  kakaoBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.kakao,
    borderRadius: radii.md,
    borderBottomWidth: 4,
    borderBottomColor: colors.yolkDeep,
    paddingVertical: 15,
    alignItems: 'center',
  },
  kakaoText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  devBtn: { marginTop: 14, padding: 6 },
  devText: { fontFamily: fonts.body, fontSize: 13, color: colors.feather, textDecorationLine: 'underline' },
  laterBtn: { marginTop: 10, padding: 8 },
  laterText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted },
});
