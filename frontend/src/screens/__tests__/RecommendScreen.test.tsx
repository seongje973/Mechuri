import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RecommendScreen from '../RecommendScreen';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../../analytics/events', () => ({
  newSessionId: jest.fn(() => 'session-test-0001'),
  track: jest.fn(),
}));

jest.mock('../../storage/userData', () => ({
  addHistory: jest.fn(async () => {}),
  getAvoidTags: jest.fn(async () => []),
  getFavorites: jest.fn(async () => []),
  getHistories: jest.fn(async () => []),
  isFavorite: jest.fn(async () => false),
  toggleFavorite: jest.fn(async () => ({ favorited: true, count: 1 })),
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
    const node = screen.getByTestId('reveal-name');
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
    // 게스트도 기록이 저장된다 (저장소가 기기/서버를 고른다)
    const { addHistory } = jest.requireMock('../../storage/userData');
    expect(addHistory).toHaveBeenCalledWith(expect.objectContaining({ menuName: shownTop() }));
  });

  it('즐겨찾기를 못 읽어도 최근 먹은 기록 감점은 적용된다', async () => {
    await reachReveal();
    const first = shownTop();
    screen.unmount();

    const { getFavorites, getHistories } = jest.requireMock('../../storage/userData');
    getFavorites.mockRejectedValueOnce(new Error('favorites failed'));
    getHistories.mockResolvedValueOnce([{ menuName: first, createdAt: Date.now() }]);
    await reachReveal();
    expect(shownTop()).not.toBe(first);
  });

  it('기록 저장이 실패하면 먹을래요가 다시 눌리는 상태로 남는다', async () => {
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
    const { addHistory } = jest.requireMock('../../storage/userData');
    addHistory.mockRejectedValueOnce(new Error('POST /api/user/histories failed (500)'));
    await act(async () => {
      fireEvent.press(screen.getByText('이거 먹을래요'));
    });
    expect(screen.queryByText('맛있게 드세요!')).toBeNull();
    expect(alert).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('추천 한 판의 지표 이벤트를 같은 세션 ID로 보낸다 (US-23)', async () => {
    const { track } = jest.requireMock('../../analytics/events');
    track.mockClear();
    await reachReveal();
    const top = shownTop();
    fireEvent.press(screen.getByText('배달'));
    const types = track.mock.calls.map((c: any[]) => c[1].type);
    expect(types[0]).toBe('rec_start');
    expect(types).toContain('question_answer');
    expect(types).toContain('result_shown');
    expect(track).toHaveBeenLastCalledWith('session-test-0001', { type: 'accept', payload: { action: 'delivery', menu: top } });
    expect(track.mock.calls.every((c: any[]) => c[0] === 'session-test-0001')).toBe(true);
  });

  it('저장 중에 먹을래요를 두 번 눌러도 기록은 한 번만 보낸다', async () => {
    const { addHistory } = jest.requireMock('../../storage/userData');
    await reachReveal();
    let finish!: () => void;
    addHistory.mockClear();
    addHistory.mockImplementationOnce(() => new Promise<void>(r => (finish = r)));
    await act(async () => {
      fireEvent.press(screen.getByText('이거 먹을래요'));
      fireEvent.press(screen.getByText('이거 먹을래요'));
    });
    await act(async () => {
      finish();
    });
    expect(addHistory).toHaveBeenCalledTimes(1);
    expect(screen.getByText('맛있게 드세요!')).toBeTruthy();
  });

  it('하트를 누른 뒤 늦게 온 이전 조회 결과가 하트를 되돌리지 않는다', async () => {
    const { isFavorite } = jest.requireMock('../../storage/userData');
    let lookup!: (v: boolean) => void;
    isFavorite.mockImplementation(() => new Promise(r => (lookup = r)));
    await reachReveal();
    await act(async () => {
      fireEvent.press(screen.getByText('🤍'));
    });
    expect(screen.getByText('❤️')).toBeTruthy();
    await act(async () => {
      lookup(false);
    });
    expect(screen.getByText('❤️')).toBeTruthy();
    isFavorite.mockImplementation(async () => false);
  });

  describe('날씨 보정 (L-02)', () => {
    const Location = jest.requireMock('expo-location');
    const { apiFetch } = jest.requireMock('../../api/client');
    const weatherCalls = () => apiFetch.mock.calls.filter((c: any[]) => String(c[0]).startsWith('/api/weather'));

    beforeEach(() => apiFetch.mockClear());
    afterEach(() => {
      Location.requestForegroundPermissionsAsync.mockImplementation(async () => ({ status: 'denied' }));
      apiFetch.mockImplementation(async () => ({ ok: true, json: async () => ({ restaurants: [], histories: [] }) }));
    });

    it('추천을 시작한 뒤에 GPS가 잡혀도 날씨를 받는다', async () => {
      let grant!: (v: unknown) => void;
      Location.requestForegroundPermissionsAsync.mockImplementationOnce(() => new Promise(r => (grant = r)));
      Location.getCurrentPositionAsync.mockResolvedValueOnce({ coords: { latitude: 37.5, longitude: 127 } });
      renderScreen();
      await act(async () => {
        fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
      });
      expect(weatherCalls()).toHaveLength(0);
      await act(async () => {
        grant({ status: 'granted' });
      });
      expect(weatherCalls()).toHaveLength(1);
    });

    it('날씨 응답이 늦어도 잠깐만 기다리고 결과를 보여 준다', async () => {
      Location.requestForegroundPermissionsAsync.mockImplementationOnce(async () => ({ status: 'granted' }));
      Location.getCurrentPositionAsync.mockResolvedValueOnce({ coords: { latitude: 37.5, longitude: 127 } });
      apiFetch.mockImplementation((path: string) =>
        String(path).startsWith('/api/weather')
          ? new Promise(() => {})
          : Promise.resolve({ ok: true, json: async () => ({ restaurants: [], histories: [] }) })
      );
      renderScreen();
      await act(async () => {});
      await act(async () => {
        fireEvent.press(screen.getByText('추리 퀴즈 시작하기 ➔'));
      });
      expect(weatherCalls()).toHaveLength(1);
      for (let i = 0; i < 10 && !screen.queryByText(/메뉴는…/); i++) {
        await act(async () => {
          fireEvent.press(screen.getByText('👍 예'));
        });
        if (!screen.queryByText('👍 예')) break;
      }
      expect(await screen.findByText('당신이 생각한 메뉴는…', {}, { timeout: 3000 })).toBeTruthy();
    });
  });
});
