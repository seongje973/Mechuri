import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
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

  const reachReveal = async (navigate = jest.fn()) => {
    render(<RecommendScreen navigation={{ navigate }} isLoggedIn={false} userProfile={null} />);
    await act(async () => {
      fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
    });
    for (let i = 0; i < 10 && !screen.queryByText(/메뉴는…/); i++) {
      await act(async () => {
        fireEvent.press(screen.getByText('👍 예'));
      });
    }
    return navigate;
  };

  const shownTop = () => {
    const node = screen.getByText(/!$/);
    return String(([] as unknown[]).concat(node.props.children).join('')).replace(/!$/, '');
  };

  it('틀렸어요를 누르면 같은 메뉴가 다시 1위로 나오지 않고, 두 번째엔 월드컵을 제안한다', async () => {
    await reachReveal();
    const first = shownTop();

    await act(async () => {
      fireEvent.press(screen.getByText('틀렸어요 🙅'));
    });
    for (let i = 0; i < 5 && !screen.queryByText('그렇다면 이 메뉴는…'); i++) {
      await act(async () => {
        fireEvent.press(screen.getByText('👍 예'));
      });
    }
    expect(screen.getByText('그렇다면 이 메뉴는…')).toBeTruthy();
    expect(shownTop()).not.toBe(first);

    await act(async () => {
      fireEvent.press(screen.getByText('또 틀렸어요, 월드컵으로 정할래요'));
    });
    expect(screen.getByText('메추리가 헷갈려요. 직접 골라 주세요!')).toBeTruthy();
  });

  it('근처 식당은 지도 탭에 메뉴 이름을 넘긴다', async () => {
    const navigate = await reachReveal();
    const top = shownTop();
    fireEvent.press(screen.getByText('근처 식당'));
    expect(navigate).toHaveBeenCalledWith('지도', expect.objectContaining({ keyword: top }));
  });

  it('이거 먹을래요를 누르면 확인 문구로 바뀐다', async () => {
    await reachReveal();
    await act(async () => {
      fireEvent.press(screen.getByText('이거 먹을래요'));
    });
    expect(screen.getByText('맛있게 드세요!')).toBeTruthy();
  });

  it('로그인 상태에서 기록 저장이 실패하면 먹을래요가 다시 눌리는 상태로 남는다', async () => {
    const { apiFetch } = jest.requireMock('../../api/client');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<RecommendScreen navigation={{ navigate: jest.fn() }} isLoggedIn userProfile={null} />);
    await act(async () => {
      fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
    });
    for (let i = 0; i < 10 && !screen.queryByText(/메뉴는…/); i++) {
      await act(async () => {
        fireEvent.press(screen.getByText('👍 예'));
      });
    }
    apiFetch.mockImplementationOnce(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await act(async () => {
      fireEvent.press(screen.getByText('이거 먹을래요'));
    });
    expect(screen.queryByText('맛있게 드세요!')).toBeNull();
    expect(alert).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('저장 중에 먹을래요를 두 번 눌러도 기록은 한 번만 보낸다', async () => {
    const { apiFetch } = jest.requireMock('../../api/client');
    render(<RecommendScreen navigation={{ navigate: jest.fn() }} isLoggedIn userProfile={null} />);
    await act(async () => {
      fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
    });
    for (let i = 0; i < 10 && !screen.queryByText(/메뉴는…/); i++) {
      await act(async () => {
        fireEvent.press(screen.getByText('👍 예'));
      });
    }
    let finish!: (v: unknown) => void;
    apiFetch.mockClear();
    apiFetch.mockImplementationOnce(() => new Promise(r => (finish = r)));
    await act(async () => {
      fireEvent.press(screen.getByText('이거 먹을래요'));
      fireEvent.press(screen.getByText('이거 먹을래요'));
    });
    await act(async () => {
      finish({ ok: true, status: 201, json: async () => ({}) });
    });
    const posts = apiFetch.mock.calls.filter((c: any[]) => c[0] === '/api/user/histories');
    expect(posts).toHaveLength(1);
    expect(screen.getByText('맛있게 드세요!')).toBeTruthy();
  });

  it('한 메뉴를 저장하는 중에 다른 메뉴로 바꿔 누르면 그 메뉴도 저장한다', async () => {
    const { apiFetch } = jest.requireMock('../../api/client');
    render(<RecommendScreen navigation={{ navigate: jest.fn() }} isLoggedIn userProfile={null} />);
    await act(async () => {
      fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
    });
    for (let i = 0; i < 10 && !screen.queryByText(/메뉴는…/); i++) {
      await act(async () => {
        fireEvent.press(screen.getByText('👍 예'));
      });
    }
    apiFetch.mockClear();
    apiFetch.mockImplementationOnce(() => new Promise(() => {}));
    await act(async () => {
      fireEvent.press(screen.getByText('이거 먹을래요'));
    });
    const altName = screen.getAllByTestId('alt-name')[0].props.children as string;
    await act(async () => {
      fireEvent.press(screen.getByText(altName));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('이거 먹을래요'));
    });
    const saved = apiFetch.mock.calls.filter((c: any[]) => c[0] === '/api/user/histories').map((c: any[]) => c[1].body.menuName);
    expect(saved).toHaveLength(2);
    expect(saved[1]).toBe(altName);
  });
});
