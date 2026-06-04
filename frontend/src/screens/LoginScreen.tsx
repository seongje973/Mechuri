import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Linking 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("경고 ⚠️", "이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (!isLogin && !nickname) {
      Alert.alert("경고 ⚠️", "미식가 닉네임을 입력해 주세요.");
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second network timeout

    try {
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const endpoint = isLogin ? 'login' : 'register';
      const url = `http://${ip}:5000/api/auth/${endpoint}`;

      console.log(`📡 Sending auth request to: ${url}`);

      const bodyData = isLogin 
        ? { email, password }
        : { email, password, nickname };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        // Save token and user details in AsyncStorage
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
        
        console.log("✅ Authenticated successfully! Token stored.");
        onLoginSuccess();
      } else {
        Alert.alert("인증 실패 ❌", data.error || "이메일 혹은 비밀번호가 잘못되었습니다.");
      }
    } catch (error) {
      console.log("❌ Authentication connection failed:", error);
      Alert.alert("서버 연결 실패 📡", "백엔드 서버가 켜져 있는지 혹은 IP 설정을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    const randomId = Math.floor(Math.random() * 100000);
    const guestEmail = `guest_${randomId}_${Date.now()}@mechuri.com`;
    const guestPassword = 'guest_password_secure_2026';
    const guestNickname = '임시 미식가 🐣';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second fast timeout for guest mode

    try {
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const url = `http://${ip}:5000/api/auth/register`;

      console.log("📡 Registering anonymous guest user on backend MySQL...");
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: guestEmail,
          password: guestPassword,
          nickname: guestNickname
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
        
        console.log("✅ Guest registered on database successfully! Token stored.");
        onLoginSuccess();
      } else {
        throw new Error(data.error || "Backend registration failed");
      }
    } catch (error) {
      console.log("⚠️ Backend guest registration failed. Falling back to local offline guest mode.");
      clearTimeout(timeoutId); // Clear timeout in case of other errors
      
      await AsyncStorage.setItem('auth_token', 'local_guest_token_session_2026');
      await AsyncStorage.setItem('user_profile', JSON.stringify({
        id: 0,
        email: 'guest@mechuri.com',
        nickname: '익명의 게스트 🐣',
        avoidTags: ''
      }));
      
      onLoginSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    Alert.alert(
      "💛 카카오 로그인 연동",
      "카카오 계정으로 쉽고 빠르게 로그인하여 맛있는 음식을 추천받아 보세요!",
      [
        {
          text: "실시간 카카오 로그인 🌐",
          onPress: async () => {
            setLoading(true);
            try {
              const client_id = "f9395e2d0bbfe79e277bdbeaaf6b568d"; 
              const redirect_uri = encodeURIComponent("http://localhost:5000/api/auth/kakao/callback");
              const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code`;
              
              console.log("🌐 Opening Kakao OAuth Login URL in browser...");
              await Linking.openURL(authUrl);
            } catch (e) {
              Alert.alert("에러", "카카오 브라우저를 열지 못했습니다.");
            } finally {
              setLoading(false);
            }
          }
        },
        {
          text: "간편 카카오 동기화 🐣",
          onPress: async () => {
            setLoading(true);
            const randomId = Math.floor(Math.random() * 100000);
            const mockKakaoProfile = {
              id: randomId,
              email: `kakao_${randomId}@kakaomail.com`,
              nickname: `카카오 미식가 💛`
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            try {
              const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
              const url = `http://${ip}:5000/api/auth/kakao/mobile`;

              console.log("📡 Synching Kakao profile to MySQL database...");
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mockKakaoProfile),
                signal: controller.signal
              });

              clearTimeout(timeoutId);
              const data = await response.json();

              if (response.ok) {
                await AsyncStorage.setItem('auth_token', data.token);
                await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
                
                console.log("✅ Kakao simulated auth sync succeeded! Token stored.");
                onLoginSuccess();
              } else {
                throw new Error(data.error);
              }
            } catch (error) {
              console.log("⚠️ Kakao mobile auth sync failed. Falling back to local offline Kakao mode.");
              clearTimeout(timeoutId);

              await AsyncStorage.setItem('auth_token', 'local_kakao_token_session_2026');
              await AsyncStorage.setItem('user_profile', JSON.stringify({
                id: randomId,
                email: mockKakaoProfile.email,
                nickname: mockKakaoProfile.nickname,
                avoidTags: ''
              }));
              onLoginSuccess();
            } finally {
              setLoading(false);
            }
          }
        },
        { text: "취소", style: "cancel" }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          
          {/* Logo Brand Header */}
          <View style={styles.logoSection}>
            <Text style={styles.logoEmoji}>🐣</Text>
            <Text style={styles.logoText}>메추리</Text>
            <Text style={styles.logoSub}>오늘 가장 먹고 싶어 하는 완벽한 메뉴 추리 요정</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isLogin ? "반가워요! 로그인" : "새로운 미식가 등록"}
            </Text>

            {/* Inputs */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>이메일 주소</Text>
              <TextInput 
                style={styles.input}
                placeholder="foodie@mechuri.com"
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

            {!isLogin && (
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

            {/* Action Button */}
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#1c1917" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {isLogin ? "미식가로 입장하기 ➔" : "메추리 가입 완료 🐣"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Kakao Login Button */}
            <TouchableOpacity 
              style={styles.kakaoBtn}
              onPress={handleKakaoLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.kakaoBtnText}>💛 카카오 계정으로 로그인</Text>
            </TouchableOpacity>

            {/* Guest Entry Button */}
            <TouchableOpacity 
              style={styles.guestBtn}
              onPress={handleGuestLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.guestBtnText}>🍳 게스트로 가볍게 시작하기</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Switch Link */}
          <TouchableOpacity 
            style={styles.switchLink}
            onPress={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin 
                ? "아직 계정이 없으신가요? 회원가입하기"
                : "이미 계정이 있으신가요? 로그인하기"
              }
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1917', // Warm Dark Stone
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fbbf24', // Gold
    letterSpacing: 1.5,
  },
  logoSub: {
    fontSize: 12,
    color: '#a8a29e',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(41, 37, 36, 0.65)', // Onyx Card
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(28, 25, 23, 0.6)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionBtn: {
    backgroundColor: '#fbbf24', // Gold Accent
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#1c1917',
    fontSize: 15,
    fontWeight: '800',
  },
  switchLink: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  switchText: {
    color: '#a8a29e',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  guestBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  guestBtnText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '700',
  },
  kakaoBtn: {
    backgroundColor: '#FEE500', // Standard Kakao Yellow
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FEE500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  kakaoBtnText: {
    color: '#191919', // Standard Kakao Dark Text
    fontSize: 14,
    fontWeight: '800',
  }
});
