import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, saveSession } from '../api/client';
import { devKakaoLogin, openKakaoLogin } from '../api/kakaoLogin';
import TasteSheet from '../components/TasteSheet';
import { Ionicons } from '@expo/vector-icons';
import QuailBadge from '../components/QuailBadge';
import {
  HistoryEntry,
  UserStats,
  clearHistories,
  deleteAccount,
  getAvoidTags,
  getFavorites,
  getHistories,
  getPreferences,
  getStats
} from '../storage/userData';
import { requestLoginPrompt } from '../storage/loginPrompt';
import { EMPTY_PREFERENCES, TastePreferences } from '../engine/preferences';
import { buildMealReport, reportInsight } from '../engine/mealReport';
import { colors, fonts, layout, radii } from '../theme';

interface MyPageScreenProps {
  navigation: any;
  isLoggedIn: boolean;
  userProfile: any;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

const SPICY_LABEL: Record<NonNullable<TastePreferences['spicy']>, string> = {
  mild: '안 매운 맛',
  normal: '보통 매운맛',
  hot: '매운맛 좋아요',
};

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
  const [loading, setLoading] = useState(false);

  // Email Authentication Form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 식사 리포트와 취향 카드. 하나가 실패해도 나머지는 보여 준다
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
  const [avoidTags, setAvoidTagsState] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<TastePreferences>(EMPTY_PREFERENCES);
  // 가장 최근 조회만 반영한다. 로그아웃·계정 변경 전에 시작한 조회가 늦게 끝나도 덮어쓰지 않게
  const loadSeq = useRef(0);

  const loadUserData = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    const [statsResult, historyResult, tagResult, prefResult] = await Promise.allSettled([
      getStats(),
      getHistories(),
      getAvoidTags(),
      getPreferences(),
    ]);
    if (seq !== loadSeq.current) return;
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    else console.log('❌ Error loading MyPage stats:', statsResult.reason);
    if (historyResult.status === 'fulfilled') setHistories(historyResult.value);
    if (tagResult.status === 'fulfilled') setAvoidTagsState(tagResult.value);
    if (prefResult.status === 'fulfilled') setPrefs(prefResult.value ?? EMPTY_PREFERENCES);
    setLoading(false);
  }, []);

  // 계정이 바뀌면 이전 계정의 기록이 남지 않게 비우고, 진행 중인 조회는 무시한다.
  // 아래 조회 effect보다 먼저 선언해야 새 조회 순번이 이 무효화 뒤에 매겨진다
  useEffect(() => {
    loadSeq.current += 1;
    setStats({ eatenCount: 0, favoritesCount: 0, avoidCount: 0 });
    setHistories([]);
    setAvoidTagsState([]);
    setPrefs(EMPTY_PREFERENCES);
  }, [isGuest, userProfile]);

  // 탭에 들어올 때마다 새로 읽는다 (다른 화면에서 기록·최애가 늘었을 수 있음)
  useEffect(() => {
    loadUserData();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadUserData();
      if (isGuest) requestLoginPrompt('mypage');
    });
    return unsubscribe;
    // userProfile이 바뀌면(예: 앱 시작 때 남은 게스트 기록을 다시 옮긴 뒤) 새로 읽는다
  }, [navigation, isGuest, userProfile, loadUserData]);

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

  const handleDeleteAccount = () => {
    const confirmDelete = async () => {
      try {
        await deleteAccount();
        onLogout();
        Alert.alert("탈퇴 완료", "계정과 모든 기록을 지웠어요. 그동안 고마웠어요 🐣");
      } catch (e) {
        Alert.alert("에러", "탈퇴하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.");
      }
    };

    Alert.alert(
      "회원 탈퇴",
      "계정과 식사 기록, 최애 메뉴, 기피 설정이 모두 지워지고 되돌릴 수 없어요. 정말 탈퇴할까요?",
      [
        { text: "취소", style: "cancel" },
        { text: "탈퇴하기", style: "destructive", onPress: confirmDelete }
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

  const [tasteOpen, setTasteOpen] = useState(false);
  const handlePressAvoid = () => setTasteOpen(true);

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

  const renderGuestLogin = () => (
    <View style={styles.guestLogin}>
      <TouchableOpacity
        style={styles.kakaoBtn}
        onPress={handleRealKakaoLogin}
        disabled={authLoading}
        activeOpacity={0.85}
      >
        <Text style={styles.kakaoBtnText}>카카오로 기록 저장하기</Text>
      </TouchableOpacity>
      <Text style={styles.guestLoginDesc}>
        로그인하면 이 폰의 기록이 계정으로 옮겨져서 다른 폰에서도 볼 수 있어요.
      </Text>

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
              <ActivityIndicator color={colors.onBrand} />
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

  const report = buildMealReport(histories);
  const reportMax = Math.max(1, ...report.categories.map(c => c.count));
  const hasTaste = avoidTags.length > 0 || prefs.likedCuisines.length > 0 || prefs.spicy !== null;

  const listRows: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }[] = [
    { label: '최애 메뉴', value: `${stats.favoritesCount}개`, icon: 'heart-outline', onPress: handlePressFavorite },
    { label: '식사 기록', value: `${stats.eatenCount}끼`, icon: 'calendar-outline', onPress: handlePressHistory },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>내 정보</Text>

          {/* 프로필 */}
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <QuailBadge size={56} />
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{isGuest ? '게스트 미식가' : `${userProfile.nickname} 님`}</Text>
                <Text style={styles.userEmail}>{isGuest ? '기록은 이 폰에 저장돼요' : userProfile.email}</Text>
              </View>
              {loading && <ActivityIndicator color={colors.brand} />}
            </View>
            {isGuest && renderGuestLogin()}
          </View>

          {/* 이번 달 식사 리포트 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{report.month}월 식사 리포트</Text>
              <Text style={styles.cardMeta}>{report.total}끼</Text>
            </View>
            {report.categories.map(c => (
              <View key={c.name} style={styles.barRow}>
                <Text style={styles.barLabel}>{c.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(c.count / reportMax) * 100}%` }]} />
                </View>
                <Text style={styles.barCount}>{c.count}</Text>
              </View>
            ))}
            <View style={styles.insight}>
              <Text style={styles.insightText}>{reportInsight(report)}</Text>
            </View>
          </View>

          {/* 내 취향 설정 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>내 취향 설정</Text>
              <TouchableOpacity onPress={handlePressAvoid} style={styles.editBtn} accessibilityRole="button">
                <Text style={styles.editText}>수정</Text>
              </TouchableOpacity>
            </View>
            {hasTaste ? (
              <>
                {avoidTags.length > 0 && (
                  <View style={styles.tasteGroup}>
                    <Text style={styles.tasteLabel}>못 먹어요</Text>
                    <View style={styles.chipWrap}>
                      {avoidTags.map(t => (
                        <View key={t} style={[styles.chip, styles.chipAvoid]}>
                          <Text style={[styles.chipText, styles.chipAvoidText]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {(prefs.likedCuisines.length > 0 || prefs.spicy) && (
                  <View style={styles.tasteGroup}>
                    <Text style={styles.tasteLabel}>좋아해요</Text>
                    <View style={styles.chipWrap}>
                      {prefs.likedCuisines.map(c => (
                        <View key={c} style={[styles.chip, styles.chipLike]}>
                          <Text style={[styles.chipText, styles.chipLikeText]}>{c}</Text>
                        </View>
                      ))}
                      {prefs.spicy && (
                        <View style={[styles.chip, styles.chipLike]}>
                          <Text style={[styles.chipText, styles.chipLikeText]}>{SPICY_LABEL[prefs.spicy]}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity onPress={handlePressAvoid} activeOpacity={0.7}>
                <Text style={styles.tasteEmpty}>알레르기, 안 먹는 음식, 좋아하는 음식을 알려 주면 추천이 더 정확해져요.</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 최애 메뉴 · 식사 기록 */}
          <View style={styles.listCard}>
            {listRows.map(row => (
              <TouchableOpacity key={row.label} style={styles.listRow} onPress={row.onPress} activeOpacity={0.7}>
                <View style={styles.listIcon}>
                  <Ionicons name={row.icon} size={20} color={colors.subtle} />
                </View>
                <Text style={styles.listTitle}>{row.label}</Text>
                <Text style={styles.listValue}>{row.value}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </TouchableOpacity>
            ))}
          </View>

          {!isGuest && (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>로그아웃</Text>
            </TouchableOpacity>
          )}

          {!isGuest && (
            <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
              <Text style={styles.deleteAccountText}>회원 탈퇴</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.versionText}>버전 정보 v1.2.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <TasteSheet visible={tasteOpen} mode="edit" onClose={() => setTasteOpen(false)} onSaved={() => loadUserData()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: colors.ink,
    paddingLeft: 4,
    paddingVertical: 7,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.heavy,
    fontSize: 18,
    lineHeight: 25,
    color: colors.ink,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  guestLogin: {
    marginTop: 16,
  },
  guestLoginDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  kakaoBtn: {
    backgroundColor: colors.kakao,
    borderRadius: radii.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoBtnText: {
    fontFamily: fonts.bold,
    color: colors.kakaoText,
    fontSize: 15,
  },
  devBypassBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  devBypassText: {
    fontFamily: fonts.body,
    color: colors.brandText,
    fontSize: 12.5,
    textDecorationLine: 'underline',
  },
  accordionHeader: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    alignItems: 'center',
    minHeight: layout.minTouch,
    justifyContent: 'center',
  },
  accordionTitle: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
  },
  emailFormContent: {
    marginTop: 10,
  },
  formTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    fontFamily: fonts.body,
    backgroundColor: colors.fill,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    color: colors.ink,
    fontSize: 14.5,
  },
  emailSubmitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  emailSubmitText: {
    fontFamily: fonts.bold,
    color: colors.onBrand,
    fontSize: 15,
  },
  modeSwitchBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  modeSwitchText: {
    fontFamily: fonts.body,
    color: colors.brandText,
    fontSize: 12.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: fonts.heavy,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
  },
  cardMeta: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  barLabel: {
    width: 44,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.subtle,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.fill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  barCount: {
    width: 22,
    textAlign: 'right',
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  insight: {
    backgroundColor: colors.brandSoft,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  insightText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.brandText,
  },
  editBtn: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginVertical: -10,
  },
  editText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.brandText,
  },
  tasteGroup: {
    marginBottom: 12,
  },
  tasteLabel: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: colors.muted,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  chipAvoid: {
    backgroundColor: colors.chiliSoft,
  },
  chipAvoidText: {
    color: colors.chiliText,
  },
  chipLike: {
    backgroundColor: colors.brandSoft,
  },
  chipLikeText: {
    color: colors.brandText,
  },
  tasteEmpty: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.muted,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 6,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
  },
  listValue: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.muted,
  },
  logoutBtn: {
    marginTop: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    fontFamily: fonts.bold,
    color: colors.subtle,
    fontSize: 14.5,
  },
  deleteAccountBtn: {
    alignSelf: 'center',
    padding: 6,
  },
  deleteAccountText: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 12.5,
    textDecorationLine: 'underline',
  },
  versionText: {
    fontFamily: fonts.body,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 8,
  },
});
