import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RecommendScreen from '../RecommendScreen';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../../api/client', () => ({
  apiFetch: jest.fn(async () => ({ ok: true, json: async () => ({ restaurants: [], histories: [] }) })),
  getStoredProfile: jest.fn(async () => null),
}));

const renderScreen = () =>
  render(<RecommendScreen navigation={{ navigate: jest.fn() }} isLoggedIn={false} userProfile={null} />);

describe('RecommendScreen', () => {
  it('질문에 답하면 결과 공개와 대안 2개를 보여 준다', async () => {
    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
    });

    expect(screen.getByText(`질문 1 / 7`)).toBeTruthy();

    // 결과가 나올 때까지 "예"만 누른다 (최대 7문항)
    for (let i = 0; i < 7 && !screen.queryByText('당신이 생각한 메뉴는…'); i++) {
      await act(async () => {
        fireEvent.press(screen.getByText('👍 예'));
      });
    }

    expect(screen.getByText('당신이 생각한 메뉴는…')).toBeTruthy();
    expect(screen.getByText('이건 어때요?')).toBeTruthy();
  });

  it('대안을 누르면 그 메뉴가 1위 자리로 올라간다', async () => {
    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
    });
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.press(screen.getByText('🤷 상관없음'));
      });
    }
    await act(async () => {
      fireEvent.press(screen.getByText('바로 결과 보기 ➔'));
    });

    const altName = screen.getAllByTestId('alt-name')[0].props.children as string;
    await act(async () => {
      fireEvent.press(screen.getByText(altName));
    });
    expect(screen.getByText(`${altName}!`)).toBeTruthy();
  });

  it('홈에서 autoStart로 들어오면 인트로 없이 첫 질문을 보여 준다', async () => {
    render(
      <RecommendScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { autoStart: 1 } }}
        isLoggedIn={false}
        userProfile={null}
      />
    );
    expect(await screen.findByText('질문 1 / 7')).toBeTruthy();
    expect(screen.queryByText('추리 퀴즈 시작하기 ➔')).toBeNull();
  });
});
