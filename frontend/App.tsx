import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import { fontRegistration } from './src/theme/fontRegistration';

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontRegistration);

  // 로드에 실패하면 시스템 글꼴로 그냥 띄운다
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
