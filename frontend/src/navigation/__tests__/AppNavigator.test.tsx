import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
    render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );
    await waitFor(() => expect(screen.getByText('🏠 홈')).toBeTruthy());
    ['🍔 추천', '👥 같이', '📍 지도', '👤 내정보'].forEach((label) => expect(screen.getByText(label)).toBeTruthy());
    expect(screen.queryByText('월드컵')).toBeNull();
    expect(screen.queryByText('🏆 월드컵')).toBeNull();
  });
});
