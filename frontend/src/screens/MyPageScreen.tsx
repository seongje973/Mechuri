import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MyPageScreenProps {
  isLoggedIn: boolean;
  userProfile: any;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

export default function MyPageScreen({ 
  isLoggedIn, 
  userProfile, 
  onLoginSuccess, 
  onLogout 
}: MyPageScreenProps) {
  
  // Profile & Statistics state
  const [stats, setStats] = useState({ eatenCount: 0, favoritesCount: 0, avoidCount: 0 });
  const [loading, setLoading] = useState(false);

  // Email Authentication Form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadUserData();
    }
  }, [isLoggedIn]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      
      // Fetch live stats
      const statsRes = await fetch(`http://${ip}:5000/api/user/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.log('❌ Error loading MyPage stats from backend:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real OAuth Kakao Login
  const handleRealKakaoLogin = async () => {
    setAuthLoading(true);
    try {
      const client_id = "f9395e2d0bbfe79e277bdbeaaf6b568d"; 
      const redirect_uri = encodeURIComponent("http://localhost:5000/api/auth/kakao/callback");
      
      // Let's pass the standard Expo development host '127.0.0.1:8081' as state 
      // If the developer is testing on real device, backend dynamically parses the state to redirect.
      const devHost = Platform.OS === 'android' ? '10.0.2.2:8081' : '127.0.0.1:8081';
      const stateParam = encodeURIComponent(devHost);
      
      const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&state=${stateParam}`;
      
      console.log("🌐 Opening Kakao OAuth Login URL in browser:", authUrl);
      await Linking.openURL(authUrl);
    } catch (e) {
      Alert.alert("연결 실패 🔌", "카카오 실시간 브라우저 로그인 창을 열 수 없습니다.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Simulated Kakao Sync (For fast, reliable local development testing)
  const handleSimulatedKakaoSync = async () => {
    setAuthLoading(true);
    const randomId = Math.floor(Math.random() * 100000);
    const mockProfile = {
      id: randomId,
      email: `kakao_${randomId}@kakaomail.com`,
      nickname: `카카오 미식가 💛`
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const url = `http://${ip}:5000/api/auth/kakao/mobile`;

      console.log("📡 Synching simulated Kakao profile to backend MySQL...");
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockProfile),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
        console.log("✅ Kakao simulated auth sync succeeded!");
        onLoginSuccess();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.log("⚠️ Simulated Kakao sync failed. Falling back to offline local Kakao mode.");
      clearTimeout(timeoutId);

      await AsyncStorage.setItem('auth_token', 'local_kakao_token_session_2026');
      await AsyncStorage.setItem('user_profile', JSON.stringify({
        id: randomId,
        email: mockProfile.email,
        nickname: mockProfile.nickname,
        avoidTags: ''
      }));
      onLoginSuccess();
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const endpoint = isLoginMode ? 'login' : 'register';
      const url = `http://${ip}:5000/api/auth/${endpoint}`;

      console.log(`📡 Sending auth request to: ${url}`);

      const bodyData = isLoginMode 
        ? { email, password }
        : { email, password, nickname };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
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
      "정말로 로그아웃하고 비로그인 모드로 돌아가시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "로그아웃", 
          style: "destructive",
          onPress: async () => {
            onLogout();
          } 
        }
      ]
    );
  };

  const handlePressFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

      const res = await fetch(`http://${ip}:5000/api/user/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const favList = data.favorites || [];

      const listStr = favList.length > 0 
        ? favList.map((f: any) => `${f.emoji || '🍽️'} ${f.menuName}`).join('\n')
        : "아직 즐겨찾기한 음식이 없습니다.";

      Alert.alert(
        "❤️ 나의 최애 음식 목록",
        `추천 퀴즈 결과에서 즐겨찾기 하트를 누른 목록입니다.\n\n${listStr}`,
        [
          { text: "확인" },
          {
            text: "랜덤 샘플 추가",
            onPress: async () => {
              const sampleFoods = [
                { menuName: "삼겹살", emoji: "🥩", category: "한식" },
                { menuName: "초밥", emoji: "🍣", category: "일식" },
                { menuName: "크림파스타", emoji: "🍝", category: "양식" }
              ];
              const randomFood = sampleFoods[Math.floor(Math.random() * sampleFoods.length)];
              
              await fetch(`http://${ip}:5000/api/user/favorites`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(randomFood)
              });
              loadUserData();
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert("에러", "즐겨찾기 목록을 불러오지 못했습니다.");
    }
  };

  const handlePressAvoid = async () => {
    if (!userProfile) return;
    
    const activeTags = userProfile.avoidTags ? userProfile.avoidTags.split(',').filter(Boolean) : [];
    const availableTags = ["매운맛", "오이", "가지", "밀가루", "해산물"];

    const toggleTag = async (tag: string) => {
      let newTags = [...activeTags];
      if (newTags.includes(tag)) {
        newTags = newTags.filter(t => t !== tag);
      } else {
        newTags.push(tag);
      }
      
      const updatedString = newTags.join(',');
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

        const res = await fetch(`http://${ip}:5000/api/user/avoid-tags`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avoidTags: updatedString })
        });
        
        if (res.ok) {
          // Update cached profile
          const updatedProfile = { ...userProfile, avoidTags: updatedString };
          await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
          // We can refresh user statistics in state
          loadUserData();
          Alert.alert("필터 수정 완료 🐣", `기피 태그가 저장되었습니다: [${newTags.join(', ') || '없음'}]`);
        }
      } catch (e) {
        Alert.alert("에러", "기피 설정을 변경하지 못했습니다.");
      }
    };

    const buttons = availableTags.map(tag => ({
      text: `${activeTags.includes(tag) ? '✅' : '⬜'} ${tag}`,
      onPress: () => toggleTag(tag)
    }));

    Alert.alert(
      "🚫 알레르기 및 기피 설정",
      `여기 설정된 성분이 포함된 메뉴는 추천 결과에서 완전히 필터링됩니다!\n\n현재 활성화된 기피 성분: [${activeTags.join(', ') || '없음'}]`,
      [
        ...buttons.slice(0, 3), // Show first 3 options (e.g. 매운맛, 오이, 가지)
        { text: "닫기", style: "cancel" }
      ]
    );
  };

  const handlePressHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

      const res = await fetch(`http://${ip}:5000/api/user/histories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const historyList = data.histories || [];

      const listStr = historyList.length > 0 
        ? historyList.slice(0, 10).map((h: any) => {
            const dateStr = new Date(h.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            return `[${dateStr}] ${h.emoji || '🍽️'} ${h.menuName} ${h.restaurantName ? `(${h.restaurantName})` : ''}`;
          }).join('\n')
        : "아직 저장된 최근 식사 기록이 없습니다.";

      Alert.alert(
        "📅 나의 식사 히스토리",
        `사용자님이 먹고 딥링크로 맛집을 길찾기했던 내역입니다.\n\n${listStr}`,
        [
          { text: "확인" },
          {
            text: "전체 삭제",
            style: "destructive",
            onPress: async () => {
              await fetch(`http://${ip}:5000/api/user/histories`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              loadUserData();
              Alert.alert("완료", "식사 기록이 완전히 비워졌습니다 🐣");
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert("에러", "식사 히스토리를 불러올 수 없습니다.");
    }
  };

  // --- RENDERING: AUTHENTICATION ENTRANCE (NOT LOGGED IN) ---
  if (!isLoggedIn || !userProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
            
            {/* Logo Brand Header */}
            <View style={styles.logoSection}>
              <Text style={styles.logoEmoji}>🐣</Text>
              <Text style={styles.logoText}>메추리</Text>
              <Text style={styles.logoSub}>오늘 딱 땡기는 완벽한 메뉴 추리 요정</Text>
            </View>

            {/* Login Card Panel */}
            <View style={styles.authCard}>
              <Text style={styles.authCardTitle}>나의 미식 분석 시작하기 📊</Text>
              <Text style={styles.authCardDesc}>
                카카오 로그인을 연결하면 내가 먹은 음식 분석, 최애 메뉴 보관, 알레르기 기피 설정 등 더 멋진 개인 맞춤 추천을 즐길 수 있습니다.
              </Text>

              {/* Main Gorgeous Kakao Auth Button */}
              <TouchableOpacity 
                style={styles.kakaoBtn}
                onPress={handleRealKakaoLogin}
                disabled={authLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.kakaoBtnText}>💛 카카오 계정으로 로그인</Text>
              </TouchableOpacity>

              {/* Development Quick Bypass Link */}
              <TouchableOpacity 
                style={styles.devBypassBtn}
                onPress={handleSimulatedKakaoSync}
                disabled={authLoading}
              >
                <Text style={styles.devBypassText}>
                  브라우저 연결에 문제가 있나요? 간편 동기화로 시작하기 ➔
                </Text>
              </TouchableOpacity>

              {/* Accordion Email Auth Trigger */}
              <TouchableOpacity 
                style={styles.accordionHeader}
                onPress={() => setShowEmailForm(!showEmailForm)}
                activeOpacity={0.7}
              >
                <Text style={styles.accordionTitle}>
                  {showEmailForm ? "이메일 로그인 양식 닫기 ▴" : "또는 이메일 주소로 로그인하기 ▾"}
                </Text>
              </TouchableOpacity>

              {/* Accordion Content */}
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
                      placeholderTextColor="#78716c"
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
                      placeholderTextColor="#78716c"
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
                        placeholderTextColor="#78716c"
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
                      <ActivityIndicator color="#1c1917" />
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

            <Text style={styles.welcomeTipText}>
              💡 팁: 로그인하지 않아도 메뉴 추천 퀴즈와 지도는 자유롭게 이용할 수 있습니다!
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- RENDERING: PERSONALIZED PROFILE PANEL (LOGGED IN) ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Active Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>😋</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userProfile.nickname} 님</Text>
            <Text style={styles.userEmail}>{userProfile.email}</Text>
          </View>
        </View>

        {/* Live Stat Badges */}
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
          <Text style={styles.menuText}>❤️ 나의 최애 음식 조건 모아보기</Text>
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

        {/* Active Logout Trigger */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 미식가 로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>버전 정보 v1.1.0 (Kakao Live Sync - Onyx & Gold)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1917', // Warm Onyx Black
  },
  container: {
    padding: 24,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 50,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fbbf24', // Luxury Gold
    letterSpacing: 1.5,
  },
  logoSub: {
    fontSize: 12,
    color: '#a8a29e',
    marginTop: 6,
    textAlign: 'center',
  },
  authCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.65)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  authCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  authCardDesc: {
    fontSize: 12.5,
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
  },
  kakaoBtn: {
    backgroundColor: '#FEE500', // Standard Kakao Yellow
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FEE500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  kakaoBtnText: {
    color: '#191919',
    fontSize: 14.5,
    fontWeight: '800',
  },
  devBypassBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  devBypassText: {
    color: '#fbbf24',
    fontSize: 11.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  accordionHeader: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    alignItems: 'center',
  },
  accordionTitle: {
    color: '#a8a29e',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 6,
  },
  emailFormContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(28, 25, 23, 0.7)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#f8fafc',
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emailSubmitBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  emailSubmitText: {
    color: '#1c1917',
    fontSize: 14,
    fontWeight: '800',
  },
  modeSwitchBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  modeSwitchText: {
    color: '#a8a29e',
    fontSize: 11.5,
    fontWeight: '600',
  },
  welcomeTipText: {
    textAlign: 'center',
    color: '#57534e',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(41, 37, 36, 0.6)',
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  profileInfo: {
    marginLeft: 16,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    color: '#a8a29e',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(41, 37, 36, 0.3)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    color: '#fbbf24',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#a8a29e',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(41, 37, 36, 0.4)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
  },
  menuText: {
    color: '#e2e8f0',
    fontSize: 14.5,
    fontWeight: '600',
  },
  arrow: {
    color: '#78716c',
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    marginTop: 20,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: '#44403c',
    fontSize: 11,
    marginTop: 32,
  }
});
