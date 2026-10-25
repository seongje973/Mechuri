import React, { useState, useEffect } from 'react';
import { Platform, View, ActivityIndicator, Linking } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { apiFetch, clearSession, getAuthToken, getStoredProfile, saveSession } from '../api/client';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import RecommendScreen from '../screens/RecommendScreen';
import WorldCupScreen from '../screens/WorldCupScreen';
import MapScreen from '../screens/MapScreen';
import MyPageScreen from '../screens/MyPageScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

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
            
            const token = params['token'];
            const userJson = params['user'];
            
            if (token && userJson) {
              const user = JSON.parse(userJson);
              await saveSession(token, user);
              
              console.log("✅ Deep Link Auth Successful! Nickname:", user.nickname);
              setUserProfile(user);
              setIsLoggedIn(true);
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

  const handleLoginSuccess = async () => {
    try {
      const token = await getAuthToken();
      const profile = await getStoredProfile();
      if (token && profile) {
        setUserProfile(profile);
        setIsLoggedIn(true);
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
      <View style={{ flex: 1, backgroundColor: '#1c1917', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  // Main Hybrid Bottom Tab Navigator (No strict login guard, home opens instantly)
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#fbbf24', // Warm Gold/Amber
        tabBarInactiveTintColor: '#8c8a82', // Warm Gray
        tabBarLabelPosition: 'beside-icon', // 텍스트를 가로로 배치하여 아이콘 공간을 옆으로 밀어냄
        tabBarIcon: () => null,            // 아이콘을 완전히 안 그리도록 null 반환 (깨진 상자 제거)
        tabBarStyle: {
          backgroundColor: '#1c1917', // Warm Dark Stone
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 76 : 58,
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12.5,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
        headerShown: false, // We design our own custom beautiful headers
      })}
    >
      <Tab.Screen 
        name="홈" 
        options={{
          tabBarLabel: '🏠 홈',
        }}
      >
        {props => <HomeScreen {...props} isLoggedIn={isLoggedIn} userProfile={userProfile} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="메뉴 추천" 
        options={{
          tabBarLabel: '🍔 추천',
        }}
      >
        {props => <RecommendScreen {...props} isLoggedIn={isLoggedIn} userProfile={userProfile} />}
      </Tab.Screen>

      <Tab.Screen 
        name="월드컵" 
        options={{
          tabBarLabel: '🏆 월드컵',
        }}
      >
        {props => <WorldCupScreen {...props} isLoggedIn={isLoggedIn} userProfile={userProfile} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="지도" 
        component={MapScreen}
        options={{
          tabBarLabel: '📍 지도',
        }}
      />
      
      <Tab.Screen 
        name="마이페이지" 
        options={{
          tabBarLabel: '👤 내정보',
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
  );
}
