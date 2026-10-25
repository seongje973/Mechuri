import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { apiFetch, saveSession } from '../api/client';
import { devKakaoLogin, openKakaoLogin } from '../api/kakaoLogin';
import { AVOID_TAG_OPTIONS } from '../constants/menuData';
import {
  UserStats,
  clearHistories,
  getAvoidTags,
  getFavorites,
  getHistories,
  getStats,
  setAvoidTags
} from '../storage/userData';
import { requestLoginPrompt } from '../storage/loginPrompt';
import { colors, radii } from '../theme/colors';

interface MyPageScreenProps {
  navigation: any;
  isLoggedIn: boolean;
  userProfile: any;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

/**
 * 게스트와 로그인 사용자가 같은 화면을 쓴다. 기록은 storage/userData가 기기 또는 서버에서 읽는다.
 * 게스트에게는 위쪽에 "카카오로 저장하기" 카드를 보여 주고, 들어올 때 바텀시트로 한 번 권한다 (7일에 한 번).
 */
export default function MyPageScreen({
  navigation,
  isLoggedIn,
  userProfile,
  onLoginSuccess,
  onLogout
}: MyPageScreenProps) {
  const isGuest = !isLoggedIn || !userProfile;

  // Profile & Statistics state
  const [stats, setStats] = useState<UserStats>({ eatenCount: 0, favoritesCount: 0, avoidCount: 0 });
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Email Authentication Form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStats, tags] = await Promise.all([getStats(), getAvoidTags()]);
      setStats(nextStats);
      setActiveTags(tags);
    } catch (error) {
      console.log('❌ Error loading MyPage stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 탭에 들어올 때마다 새로 읽는다 (다른 화면에서 기록·최애가 늘었을 수 있음)
  useEffect(() => {
    loadUserData();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadUserData();
      if (isGuest) requestLoginPrompt('mypage');
    });
    return unsubscribe;
  }, [navigation, isGuest, loadUserData]);

  // Real OAuth Kakao Login
  const handleRealKakaoLogin = async () => {
    setAuthLoading(true);
    try {
      await openKakaoLogin();
    } catch (e) {
      Alert.alert("연결 실패 🔌", "카카오 로그인 창을 열 수 없습니다. EXPO_PUBLIC_KAKAO_CLIENT_ID 설정을 확인해 주세요.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Simulated Kakao Sync (For fast, reliable local development testing)
  const handleSimulatedKakaoSync = async () => {
    setAuthLoading(true);
    try {
      const { token, user } = await devKakaoLogin();
      await saveSession(token, user);
      console.log("✅ Kakao simulated auth sync succeeded!");
      onLoginSuccess();
    } catch (error) {
      // 서버가 받아주지 않는 가짜 토큰을 저장하면 이후 모든 요청이 401이 되므로, 실패하면 비로그인 상태로 둔다.
      console.log("⚠️ Simulated Kakao sync failed:", error);
      Alert.alert("연결 실패 📡", "서버에 연결하지 못했습니다. 로그인 없이도 기록은 이 폰에 저장돼요.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit Email Login / Registration
  const handleEmailSubmit = async () => {
    if (!email || !password) {
      Alert.alert("경고 ⚠️", "이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (!isLoginMode && !nickname) {
      Alert.alert("경고 ⚠️", "닉네임을 입력해 주세요.");
      return;
    }

    setAuthLoading(true);
    try {
      const endpoint = isLoginMode ? 'login' : 'register';
      const bodyData = isLoginMode
        ? { email, password }
        : { email, password, nickname };

      const response = await apiFetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        body: bodyData,
        auth: false,
        timeoutMs: 3000
      });
      const data = await response.json();

      if (response.ok) {
        await saveSession(data.token, data.user);
        console.log("✅ Email Authenticated successfully!");
        onLoginSuccess();
      } else {
        Alert.alert("실패 ❌", data.error || "아이디 또는 패스워드가 잘못되었습니다.");
      }
    } catch (error) {
      console.log("❌ Server Connection Error:", error);
      Alert.alert("연결 실패 📡", "로컬 백엔드 서버가 켜져 있는지 확인해 주세요.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "로그아웃 🚪",
      "로그아웃하면 이 폰에서는 새 게스트 기록으로 시작해요. 계정에 저장된 기록은 다시 로그인하면 그대로 있어요.",
      [
        { text: "취소", style: "cancel" },
        { text: "로그아웃", style: "destructive", onPress: onLogout }
      ]
    );
  };

  const handlePressFavorite = async () => {
    try {
      const favList = await getFavorites();
      const listStr = favList.length > 0
        ? favList.map(f => `${f.emoji || '🍽️'} ${f.menuName}`).join('\n')
        : "아직 즐겨찾기한 음식이 없습니다.";

      Alert.alert("❤️ 나의 최애 음식 목록", `추천 결과와 월드컵에서 하트를 누른 메뉴예요.\n\n${listStr}`);
    } catch (e) {
      Alert.alert("에러", "즐겨찾기 목록을 불러오지 못했습니다.");
    }
  };

  const handlePressAvoid = () => {
    const toggleTag = async (tag: string) => {
      const newTags = activeTags.includes(tag)
        ? activeTags.filter(t => t !== tag)
        : [...activeTags, tag];
      try {
        const saved = await setAvoidTags(newTags);
        setActiveTags(saved);
        loadUserData();
        Alert.alert("필터 수정 완료 🐣", `기피 태그가 저장되었습니다: [${saved.join(', ') || '없음'}]`);
      } catch (e) {
        Alert.alert("에러", "기피 설정을 변경하지 못했습니다.");
      }
    };

    const buttons = AVOID_TAG_OPTIONS.map(tag => ({
      text: `${activeTags.includes(tag) ? '✅' : '⬜'} ${tag}`,
      onPress: () => toggleTag(tag)
    }));
    const message = `여기 설정된 성분이 포함된 메뉴는 추천 결과에서 빠져요.\n\n현재 기피 성분: [${activeTags.join(', ') || '없음'}]`;

    const showPage3 = () => {
      Alert.alert("🚫 알레르기 및 기피 설정 (3/3)", message, [
        ...buttons.slice(4, 6),
        { text: "닫기", style: "cancel" }
      ]);
    };

    const showPage2 = () => {
      Alert.alert("🚫 알레르기 및 기피 설정 (2/3)", message, [
        ...buttons.slice(2, 4),
        { text: "다음 ➔", onPress: showPage3 }
      ]);
    };

    Alert.alert("🚫 알레르기 및 기피 설정 (1/3)", message, [
      ...buttons.slice(0, 2),
      { text: "다음 ➔", onPress: showPage2 }
    ]);
  };

  const handlePressHistory = async () => {
    try {
      const historyList = await getHistories();
      const listStr = historyList.length > 0
        ? historyList.slice(0, 10).map(h => {
            const dateStr = new Date(h.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            return `[${dateStr}] ${h.emoji || '🍽️'} ${h.menuName} ${h.restaurantName ? `(${h.restaurantName})` : ''}`;
          }).join('\n')
        : "아직 저장된 최근 식사 기록이 없습니다.";

      Alert.alert(
        "📅 나의 식사 히스토리",
        `추천받고 고른 메뉴 기록이에요.\n\n${listStr}`,
        [
          { text: "확인" },
          {
            text: "전체 삭제",
            style: "destructive",
            onPress: async () => {
              try {
                await clearHistories();
                loadUserData();
                Alert.alert("완료", "식사 기록이 완전히 비워졌습니다 🐣");
              } catch (e) {
                Alert.alert("에러", "식사 기록을 지우지 못했습니다.");
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert("에러", "식사 히스토리를 불러올 수 없습니다.");
    }
  };

  const renderGuestLoginCard = () => (
    <View style={styles.authCard}>
      <Text style={styles.authCardTitle}>기록을 카카오에 저장하기 💛</Text>
      <Text style={styles.authCardDesc}>
        지금 기록은 이 폰에만 있어요. 로그인하면 아래 기록이 계정으로 옮겨져서 다른 폰에서도 볼 수 있어요.
      </Text>

      <TouchableOpacity
        style={styles.kakaoBtn}
        onPress={handleRealKakaoLogin}
        disabled={authLoading}
        activeOpacity={0.85}
      >
        <Text style={styles.kakaoBtnText}>💛 카카오 계정으로 로그인</Text>
      </TouchableOpacity>

      {/* 개발 빌드에서만 보임, 서버도 운영에서는 막음 */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.devBypassBtn}
          onPress={handleSimulatedKakaoSync}
          disabled={authLoading}
        >
          <Text style={styles.devBypassText}>
            브라우저 연결에 문제가 있나요? 간편 동기화로 시작하기 ➔
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setShowEmailForm(!showEmailForm)}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionTitle}>
          {showEmailForm ? "이메일 로그인 양식 닫기 ▴" : "또는 이메일 주소로 로그인하기 ▾"}
        </Text>
      </TouchableOpacity>

      {showEmailForm && (
        <View style={styles.emailFormContent}>
          <Text style={styles.formTitle}>
            {isLoginMode ? "이메일 로그인" : "새로운 회원가입"}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>이메일 주소</Text>
            <TextInput
              style={styles.input}
              placeholder="example@mechuri.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {!isLoginMode && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>미식가 닉네임</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 배고픈메추리"
                placeholderTextColor={colors.muted}
                value={nickname}
                onChangeText={setNickname}
                autoCorrect={false}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.emailSubmitBtn}
            onPress={handleEmailSubmit}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.emailSubmitText}>
                {isLoginMode ? "미식가로 입장하기" : "메추리 가입하기"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeSwitchBtn}
            onPress={() => setIsLoginMode(!isLoginMode)}
          >
            <Text style={styles.modeSwitchText}>
              {isLoginMode
                ? "계정이 없으신가요? 간편 가입하러 가기 ➔"
                : "이미 회원이신가요? 기존 아이디로 로그인 ➔"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{isGuest ? '🐣' : '😋'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{isGuest ? '게스트 미식가' : `${userProfile.nickname} 님`}</Text>
              <Text style={styles.userEmail}>{isGuest ? '기록은 이 폰에 저장돼요' : userProfile.email}</Text>
            </View>
            {loading && <ActivityIndicator color={colors.yolkDeep} />}
          </View>

          {isGuest && renderGuestLoginCard()}

          {/* Stat Badges */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statBox} onPress={handlePressHistory}>
              <Text style={styles.statNumber}>{stats.eatenCount}</Text>
              <Text style={styles.statLabel}>먹은 기록 📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statBox} onPress={handlePressFavorite}>
              <Text style={styles.statNumber}>{stats.favoritesCount}</Text>
              <Text style={styles.statLabel}>선호 음식 ❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statBox} onPress={handlePressAvoid}>
              <Text style={styles.statNumber}>{stats.avoidCount}</Text>
              <Text style={styles.statLabel}>기피 필터 🚫</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Menu Settings */}
          <Text style={styles.sectionTitle}>⚙️ 개인 맞춤 설정</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handlePressFavorite}>
            <Text style={styles.menuText}>❤️ 나의 최애 음식 모아보기</Text>
            <Text style={styles.arrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePressAvoid}>
            <Text style={styles.menuText}>🚫 알레르기 유발 및 오이/가지 기피 차단</Text>
            <Text style={styles.arrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePressHistory}>
            <Text style={styles.menuText}>📅 내가 먹고 추천받았던 식단 히스토리</Text>
            <Text style={styles.arrow}>➔</Text>
          </TouchableOpacity>

          {!isGuest && (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>🚪 로그아웃</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.versionText}>버전 정보 v1.2.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.shell,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink,
  },
  userEmail: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  authCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  authCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  authCardDesc: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  kakaoBtn: {
    backgroundColor: colors.kakao,
    borderRadius: radii.md,
    borderBottomWidth: 4,
    borderBottomColor: colors.yolkDeep,
    paddingVertical: 14,
    alignItems: 'center',
  },
  kakaoBtnText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  devBypassBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  devBypassText: {
    color: colors.feather,
    fontSize: 12.5,
    textDecorationLine: 'underline',
  },
  accordionHeader: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    alignItems: 'center',
  },
  accordionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  emailFormContent: {
    marginTop: 14,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12.5,
    color: colors.muted,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    color: colors.ink,
    fontSize: 14.5,
  },
  emailSubmitBtn: {
    backgroundColor: colors.yolk,
    borderRadius: radii.md,
    borderBottomWidth: 4,
    borderBottomColor: colors.yolkDeep,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  emailSubmitText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  modeSwitchBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  modeSwitchText: {
    color: colors.feather,
    fontSize: 12.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomWidth: 4,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.yolkDeep,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
  },
  menuText: {
    fontSize: 14.5,
    color: colors.ink,
    fontWeight: '600',
    flex: 1,
  },
  arrow: {
    fontSize: 14,
    color: colors.quail,
    marginLeft: 8,
  },
  logoutBtn: {
    marginTop: 18,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.chili,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: colors.chili,
    fontSize: 14.5,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 24,
    marginBottom: 12,
  },
});
