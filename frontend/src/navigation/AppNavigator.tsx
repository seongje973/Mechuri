import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, clearSession, getAuthToken, getStoredProfile, saveProfile, saveSession } from '../api/client';
import { exchangeKakaoLoginCode } from '../api/kakaoLogin';
import { getPreferences, importGuestData } from '../storage/userData';
import { LoginPromptReason, onLoginPrompt, snoozeLoginPrompt } from '../storage/loginPrompt';
import LoginSheet from '../components/LoginSheet';
import TasteSheet from '../components/TasteSheet';
import { parseRoomCodeFromUrl } from '../api/rooms';
import { navigationRef } from './navigationRef';
import { colors, fonts } from '../theme';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import RecommendScreen from '../screens/RecommendScreen';
import WorldCupScreen from '../screens/WorldCupScreen';
import MapScreen from '../screens/MapScreen';
import MyPageScreen from '../screens/MyPageScreen';
import GroupScreen from '../screens/GroupScreen';

const Tab = createBottomTabNavigator();

/** 탭바 내용 높이(safe area 제외): 위 여백 8 + 아이콘 24 + 글자 + 아래 여유 */
const TAB_BAR_CONTENT_HEIGHT = 58;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** 하단 탭 아이콘: 켜지면 채운 모양, 꺼지면 선 모양 */
const TAB_ICONS: Record<string, { on: IoniconName; off: IoniconName }> = {
  홈: { on: 'home', off: 'home-outline' },
  '메뉴 추천': { on: 'help-circle', off: 'help-circle-outline' },
  같이: { on: 'people', off: 'people-outline' },
  지도: { on: 'location', off: 'location-outline' },
  마이페이지: { on: 'person', off: 'person-outline' },
};

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  // 같이 정하기 초대 링크 (mechuri://room/CODE)
  const [invite, setInvite] = useState<{ code: string; at: number } | null>(null);
  const [loginPrompt, setLoginPrompt] = useState<LoginPromptReason | null>(null);
  // 로그인 직후, 계정에 취향 설정이 아직 없으면 알레르기·취향 시트를 한 번 띄운다
  const [tasteSheetOpen, setTasteSheetOpen] = useState(false);
  const isLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  // 게스트일 때만 "카카오로 저장하기" 시트를 연다 (언제 열지는 storage/loginPrompt가 정함)
  useEffect(() => onLoginPrompt(reason => {
    if (isLoggedInRef.current === false) setLoginPrompt(reason);
  }), []);

  /**
   * 기기에 남은 게스트 기록을 방금 로그인한 계정으로 옮기고, 합쳐진 기피 태그를 반영한 프로필을 돌려준다 (US-18).
   * 실패해도 로그인은 유지하고 기록은 기기에 남겨 두었다가 다음 실행 때 다시 시도한다.
   */
  const migrateGuestData = async (profile: any, announce: boolean) => {
    try {
      const result = await importGuestData();
      if (!result.imported) return profile;
      const updated = { ...profile, avoidTags: (result.avoidTags ?? []).join(',') };
      await saveProfile(updated);
      if (announce) {
        Alert.alert('기록을 옮겼어요 🐣', `이 폰에 있던 식사 기록 ${result.histories}개, 최애 ${result.favorites}개를 계정에 저장했어요.`);
      }
      return updated;
    } catch (e) {
      console.log('⚠️ Guest data import failed, will retry on next launch:', e);
      return profile;
    }
  };

  /** 세션 저장 직후 부른다. 기록을 먼저 옮긴 뒤 화면을 로그인 상태로 바꿔서, 마이페이지가 옮겨진 기록을 읽게 한다 */
  const completeLogin = async (profile: any) => {
    setLoginPrompt(null);
    const updated = await migrateGuestData(profile, true);
    setUserProfile(updated);
    setIsLoggedIn(true);
    try {
      // 게스트 때 설정한 취향은 방금 옮겨졌으므로 그것도 없을 때만 묻는다
      if ((await getPreferences()) === null) setTasteSheetOpen(true);
    } catch (e) {
      console.log('⚠️ Could not load preferences after login:', e);
    }
  };

  // 시트에서 저장한 기피 태그를 프로필에도 반영한다 (같이 정하기 참가 때 기본값)
  const handleTasteSaved = async (avoidTags: string[]) => {
    const profile = await getStoredProfile();
    if (!profile) return;
    const updated = { ...profile, avoidTags: avoidTags.join(',') };
    await saveProfile(updated);
    setUserProfile(updated);
  };

  // Check login session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAuthToken();
        const profile = await getStoredProfile();
        if (!token || !profile) {
          setIsLoggedIn(false);
          setUserProfile(null);
          return;
        }

        // 예전 버전이 서버 연결 실패 때 저장하던 가짜 토큰('local_..._token_session_2026')은 버린다
        if (token.startsWith('local_')) {
          await clearSession();
          setIsLoggedIn(false);
          setUserProfile(null);
          return;
        }

        setUserProfile(profile);
        setIsLoggedIn(true);

        // 서버가 토큰을 거절하면(만료·위조) 비로그인으로 되돌린다. 서버에 못 닿으면 일단 그대로 둔다.
        try {
          const res = await apiFetch('/api/auth/profile', { timeoutMs: 5000 });
          if (res.status === 401) {
            await clearSession();
            setIsLoggedIn(false);
            setUserProfile(null);
          } else if (res.ok) {
            // 지난번 이관이 실패해 기기에 남은 기록이 있으면 다시 옮긴다
            setUserProfile(await migrateGuestData(profile, false));
          }
        } catch (e) {
          console.log('⚠️ Could not verify saved session (server unreachable)');
        }
      } catch (error) {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    };
    checkSession();
  }, []);

  // Deep Link Handling
  useEffect(() => {
    const processDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        console.log("🔗 Deep Link Received in AppNavigator:", url);
        const roomCode = parseRoomCodeFromUrl(url);
        if (roomCode) {
          setInvite({ code: roomCode, at: Date.now() });
          return;
        }
        // Look for auth callback trigger
        if (url.includes('auth') && url.includes('?')) {
          const queryString = url.split('?')[1];
          if (queryString) {
            const params: { [key: string]: string } = {};
            const pairs = queryString.split('&');
            for (const pair of pairs) {
              const [key, value] = pair.split('=');
              if (key && value) {
                params[key] = decodeURIComponent(value);
              }
            }
            
            // 서버는 토큰 대신 60초짜리 1회용 코드를 넘긴다. 토큰은 이 앱의 verifier와 함께 코드로 받는다.
            const loginCode = params['code'];
            if (loginCode) {
              const { token, user } = await exchangeKakaoLoginCode(loginCode);
              await saveSession(token, user);

              console.log("✅ Deep Link Auth Successful! Nickname:", user.nickname);
              await completeLogin(user);
            }
          }
        }
      } catch (error) {
        console.error("❌ Failed to process deep link:", error);
      }
    };

    // 1. If app was opened from cold start by a deep link
    Linking.getInitialURL().then((url) => {
      processDeepLink(url);
    });

    // 2. If app was already running/backgrounded and opened by deep link
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 앱이 막 켜져서 탭이 아직 없으면 준비될 때까지 기다렸다가 옮긴다. 옮긴 뒤에는 지워서 다시 끌려가지 않게
  useEffect(() => {
    if (!invite || isLoggedIn === null) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('같이', { inviteCode: invite.code, invitedAt: invite.at });
        setInvite(null);
      } else {
        timer = setTimeout(go, 100);
      }
    };
    go();
    return () => { if (timer) clearTimeout(timer); };
  }, [invite, isLoggedIn]);

  const handleLoginSuccess = async () => {
    try {
      const token = await getAuthToken();
      const profile = await getStoredProfile();
      if (token && profile) {
        await completeLogin(profile);
      }
    } catch (error) {
      console.error("❌ Error loading profile on success:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await clearSession();
      setIsLoggedIn(false);
      setUserProfile(null);
      console.log("✅ Logged out successfully. Session cleared.");
    } catch (error) {
      console.error("❌ Error logging out:", error);
    }
  };

  // Loading Splash Screen
  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brandText} />
      </View>
    );
  }

  const handleDismissLoginPrompt = () => {
    setLoginPrompt(null);
    snoozeLoginPrompt().catch(() => {});
  };

  // 로그인 없이 홈부터 바로 쓴다. 로그인은 저장할 때만 시트로 권한다
  return (
    <>
      <Tab.Navigator
        initialRouteName="홈"
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.faint,
          // 아이콘 위, 글자 아래. 홈 바·내비게이션 바 높이(safe area)는 아래 여백으로 라이브러리가 더한다
          tabBarIcon: ({ focused, color }) => {
            const icon = TAB_ICONS[route.name];
            if (!icon) return null;
            return <Ionicons name={focused ? icon.on : icon.off} size={24} color={color} />;
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            borderTopWidth: 1,
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontFamily: fonts.bold,
            fontSize: 11,
            marginTop: 2,
          },
          sceneStyle: { backgroundColor: colors.bg },
          headerShown: false, // We design our own custom beautiful headers
        })}
      >
        <Tab.Screen 
          name="홈" 
          options={{
            tabBarLabel: '홈',
          }}
        >
          {props => <HomeScreen {...props} isLoggedIn={isLoggedIn} userProfile={userProfile} />}
        </Tab.Screen>
        
        <Tab.Screen 
          name="메뉴 추천" 
          options={{
            tabBarLabel: '추천',
          }}
        >
          {props => <RecommendScreen {...props} isLoggedIn={isLoggedIn} userProfile={userProfile} />}
        </Tab.Screen>

        {/* 월드컵은 하단 탭에서 빼고 홈의 "메뉴 월드컵" 카드로만 들어간다. 화면은 그대로 둬서 navigate('월드컵')이 계속 동작한다 */}
        <Tab.Screen 
          name="월드컵" 
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        >
          {props => <WorldCupScreen {...props} isLoggedIn={isLoggedIn} userProfile={userProfile} />}
        </Tab.Screen>
        
        <Tab.Screen
          name="같이"
          options={{
            tabBarLabel: '같이',
          }}
        >
          {props => <GroupScreen {...props} isLoggedIn={isLoggedIn} userProfile={userProfile} />}
        </Tab.Screen>

        <Tab.Screen 
          name="지도" 
          component={MapScreen}
          options={{
            tabBarLabel: '지도',
          }}
        />
        
        <Tab.Screen 
          name="마이페이지" 
          options={{
            tabBarLabel: '내정보',
          }}
        >
          {props => (
            <MyPageScreen 
              {...props} 
              isLoggedIn={isLoggedIn} 
              userProfile={userProfile} 
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout} 
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
      <LoginSheet
        visible={loginPrompt !== null}
        reason={loginPrompt ?? 'mypage'}
        onDismiss={handleDismissLoginPrompt}
        onClose={() => setLoginPrompt(null)}
        onLoggedIn={handleLoginSuccess}
      />
      <TasteSheet
        visible={tasteSheetOpen}
        mode="login"
        onClose={() => setTasteSheetOpen(false)}
        onSaved={avoidTags => {
          handleTasteSaved(avoidTags).catch(() => {});
        }}
      />
    </>
  );
}
