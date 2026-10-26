import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, waitFor } from '@testing-library/react-native';
import AppNavigator from '../AppNavigator';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../screens/HomeScreen', () => () => null);
jest.mock('../../screens/RecommendScreen', () => () => null);
jest.mock('../../screens/WorldCupScreen', () => () => null);
jest.mock('../../screens/GroupScreen', () => () => null);
jest.mock('../../screens/MapScreen', () => () => null);
jest.mock('../../screens/MyPageScreen', () => () => null);

describe('AppNavigator 하단 탭', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
  });

  it('월드컵은 하단 탭에 없고 나머지 탭은 보인다', async () => {
    // 앱처럼 SafeAreaProvider 안에서 그린다 (탭바 높이가 safe area를 읽는다)
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    );
    await waitFor(() => expect(screen.getByText('홈')).toBeTruthy());
    ['추천', '같이', '지도', '내정보'].forEach((label) => expect(screen.getByText(label)).toBeTruthy());
    expect(screen.queryByText('월드컵')).toBeNull();
    expect(screen.queryByText('🏆 월드컵')).toBeNull();
  });
});
