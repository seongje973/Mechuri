import React from 'react';
import { TouchableOpacity } from 'react-native';
import HomeScreen, { FALLBACK_RANKING, getGreeting } from '../HomeScreen';
import { apiFetch } from '../../api/client';

jest.mock('../../api/client', () => ({ apiFetch: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// jest-expo가 함께 설치하는 렌더러. 타입 패키지는 따로 없어서 require로 쓴다.
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
type Node = { children: (string | Node)[]; props: any };

const mockedFetch = apiFetch as jest.Mock;

async function renderHome(props: { isLoggedIn?: boolean; userProfile?: any } = {}) {
  const navigation = { navigate: jest.fn() };
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(
      <HomeScreen navigation={navigation} isLoggedIn={props.isLoggedIn ?? false} userProfile={props.userProfile ?? null} />
    );
  });
  return { renderer, navigation };
}

const textOf = (node: Node): string =>
  node.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');

const pressByText = (renderer: any, label: string) => {
  const button = renderer.root.findAllByType(TouchableOpacity).find((b: Node) => textOf(b).includes(label));
  if (!button) throw new Error(`button not found: ${label}`);
  act(() => button.props.onPress());
};

describe('HomeScreen', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedFetch.mockRejectedValue(new Error('offline'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('"바로 추천" 한 번이면 추천 탭으로 가며 바로 시작 신호를 넘긴다', async () => {
    const { renderer, navigation } = await renderHome();
    pressByText(renderer, '바로 추천');
    expect(navigation.navigate).toHaveBeenCalledWith('메뉴 추천', { autoStart: expect.any(Number) });
  });

  it('월드컵과 지도는 보조 영역에서 갈 수 있다', async () => {
    const { renderer, navigation } = await renderHome();
    pressByText(renderer, '메뉴 월드컵');
    pressByText(renderer, '주변 식당');
    expect(navigation.navigate).toHaveBeenCalledWith('월드컵');
    expect(navigation.navigate).toHaveBeenCalledWith('지도');
  });

  it('서버에 못 닿으면 기본 랭킹을 보여준다', async () => {
    const { renderer } = await renderHome();
    const all = textOf(renderer.root);
    FALLBACK_RANKING.forEach((item) => expect(all).toContain(item.menuName));
  });

  it('로그인하면 로그인 안내 대신 닉네임으로 인사한다', async () => {
    const { renderer } = await renderHome({ isLoggedIn: true, userProfile: { nickname: '성제' } });
    const all = textOf(renderer.root);
    expect(all).toContain('성제, ');
    expect(all).not.toContain('카카오로 로그인하면');
  });

  it('시간대마다 인사가 다르다', () => {
    const greetings = new Set([8, 12, 16, 20].map((h) => getGreeting(h)));
    expect(greetings.size).toBe(4);
  });
});
