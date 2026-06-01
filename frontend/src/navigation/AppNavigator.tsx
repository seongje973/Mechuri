import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import RecommendScreen from '../screens/RecommendScreen';
import MapScreen from '../screens/MapScreen';
import MyPageScreen from '../screens/MyPageScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#38bdf8', // Sky Blue
        tabBarInactiveTintColor: '#64748b', // Slate Gray
        tabBarStyle: {
          backgroundColor: '#1e293b', // Deep Slate
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
        headerShown: false, // We design our own custom beautiful headers
      })}
    >
      <Tab.Screen 
        name="홈" 
        component={HomeScreen} 
        options={{
          tabBarLabel: '🏠 홈',
        }}
      />
      <Tab.Screen 
        name="메뉴 추천" 
        component={RecommendScreen} 
        options={{
          tabBarLabel: '🍔 메뉴 추천',
        }}
      />
      <Tab.Screen 
        name="지도" 
        component={MapScreen} 
        options={{
          tabBarLabel: '📍 지도',
        }}
      />
      <Tab.Screen 
        name="마이페이지" 
        component={MyPageScreen} 
        options={{
          tabBarLabel: '👤 마이페이지',
        }}
      />
    </Tab.Navigator>
  );
}
