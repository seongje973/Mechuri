import React from 'react';
import { TouchableOpacity } from 'react-native';
import MapScreen from '../MapScreen';
import { apiFetch } from '../../api/client';

jest.mock('../../api/client', () => ({ apiFetch: jest.fn() }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return <View>{props.children}</View>;
  });
  const Passthrough = (props: any) => <View>{props.children}</View>;
  return { __esModule: true, default: MapView, Marker: Passthrough, Callout: Passthrough };
});

// jest-expo가 함께 설치하는 렌더러. 타입 패키지는 따로 없어서 require로 쓴다.
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
type Node = { children: (string | Node)[]; props: any; type: any };

const mockedFetch = apiFetch as jest.Mock;
const mounted: any[] = [];

// 첫 실행에는 지도/리스트 모듈 변환이 느려 기본 5초를 넘길 수 있다
jest.setTimeout(15000);

const restaurant = (name: string) => ({
  name,
  distance: '100m',
  category: '한식',
  url: 'https://place.map.kakao.com/1',
  address: '서울 강남구',
  latitude: 37.5,
  longitude: 127.03,
});

const okResponse = (names: string[]) => ({
  ok: true,
  json: async () => ({ restaurants: names.map(restaurant) }),
});

const allText = (renderer: any): string =>
  renderer.root
    .findAll((n: Node) => typeof n.type === 'string' && n.type === 'Text')
    .map((n: Node) => n.children.filter((c) => typeof c === 'string').join(''))
    .join('\n');

const requestedKeywords = () =>
  mockedFetch.mock.calls.map(([url]: [string]) => new URLSearchParams(url.split('?')[1]).get('keyword'));

async function renderMap(params?: object) {
  const navigation = { setParams: jest.fn() };
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<MapScreen route={{ params }} navigation={navigation} />);
  });
  mounted.push(renderer);
  return { renderer, navigation };
}

describe('MapScreen', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => mounted.splice(0).forEach((r) => r.unmount()));
  });

  it('키워드 없이 열면 주변 맛집을 찾는다', async () => {
    mockedFetch.mockResolvedValue(okResponse(['동네 맛집']));
    const { renderer } = await renderMap();
    expect(requestedKeywords()).toEqual(['맛집']);
    expect(allText(renderer)).toContain('동네 맛집');
    expect(allText(renderer)).not.toContain('근처 식당');
  });

  it('메뉴 키워드로 들어오면 그 메뉴를 찾고 헤더에 보여준다', async () => {
    mockedFetch.mockResolvedValue(okResponse(['김치찌개 명가']));
    const { renderer } = await renderMap({ keyword: '김치찌개', requestedAt: 1 });
    expect(requestedKeywords()).toEqual(['김치찌개']);
    expect(allText(renderer)).toContain('🍽️ 김치찌개 근처 식당');
    expect(allText(renderer)).toContain('김치찌개 명가');
  });

  it('키워드나 requestedAt이 바뀌면 다시 찾는다', async () => {
    mockedFetch.mockResolvedValue(okResponse(['아무 식당']));
    const { renderer } = await renderMap({ keyword: '김치찌개', requestedAt: 1 });
    const navigation = { setParams: jest.fn() };
    await act(async () => {
      renderer.update(<MapScreen route={{ params: { keyword: '초밥', requestedAt: 2 } }} navigation={navigation} />);
    });
    await act(async () => {
      renderer.update(<MapScreen route={{ params: { keyword: '초밥', requestedAt: 3 } }} navigation={navigation} />);
    });
    expect(requestedKeywords()).toEqual(['김치찌개', '초밥', '초밥']);
    expect(allText(renderer)).toContain('초밥 근처 식당');
  });

  it('늦게 온 이전 검색 결과가 새 결과를 덮어쓰지 않는다', async () => {
    let resolveFirst: (v: any) => void = () => {};
    mockedFetch
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(okResponse(['초밥 식당']));
    const { renderer, navigation } = await renderMap({ keyword: '김치찌개', requestedAt: 1 });
    await act(async () => {
      renderer.update(<MapScreen route={{ params: { keyword: '초밥', requestedAt: 2 } }} navigation={navigation} />);
    });
    await act(async () => {
      resolveFirst(okResponse(['김치찌개 식당']));
    });
    expect(allText(renderer)).toContain('초밥 식당');
    expect(allText(renderer)).not.toContain('김치찌개 식당');
  });

  it('늦게 끝난 이전 검색이 위치 표시를 덮어쓰지 않는다', async () => {
    const Location = require('expo-location');
    let grantFirst: (v: any) => void = () => {};
    Location.requestForegroundPermissionsAsync
      .mockImplementationOnce(() => new Promise((resolve) => { grantFirst = resolve; }))
      .mockResolvedValueOnce({ status: 'denied' });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 35.1, longitude: 129.0 } });
    mockedFetch.mockResolvedValue(okResponse(['아무 식당']));
    const { renderer, navigation } = await renderMap({ keyword: '김치찌개', requestedAt: 1 });
    await act(async () => {
      renderer.update(<MapScreen route={{ params: { keyword: '초밥', requestedAt: 2 } }} navigation={navigation} />);
    });
    await act(async () => {
      grantFirst({ status: 'granted' });
    });
    expect(allText(renderer)).toContain('강남역 중심 (권한 미승인)');
    expect(allText(renderer)).not.toContain('실시간 GPS');
    expect(requestedKeywords()).toEqual(['초밥']);
  });

  it('서버 오류면 가짜 식당 대신 오류와 다시 시도를 보여주고, 다시 시도하면 다시 찾는다', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const { renderer } = await renderMap({ keyword: '김치찌개', requestedAt: 1 });
    expect(allText(renderer)).toContain('식당 정보를 불러오지 못했어요.');
    expect(allText(renderer)).not.toContain('반경 1.5km 안에');
    expect(allText(renderer)).not.toContain('⭐');

    mockedFetch.mockResolvedValueOnce(okResponse(['김치찌개 명가']));
    const retry = renderer.root
      .findAllByType(TouchableOpacity)
      .find((b: any) => b.findAll((n: Node) => n.type === 'Text' && n.children.includes('다시 시도')).length > 0);
    await act(async () => {
      retry.props.onPress();
    });
    expect(requestedKeywords()).toEqual(['김치찌개', '김치찌개']);
    expect(allText(renderer)).toContain('김치찌개 명가');
    expect(allText(renderer)).not.toContain('불러오지 못했어요');
  });

  it('네트워크가 끊겨도 가짜 식당을 보여주지 않는다', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('offline'));
    const { renderer } = await renderMap();
    expect(allText(renderer)).toContain('식당 정보를 불러오지 못했어요.');
    expect(allText(renderer)).not.toContain('곰탕');
  });

  it('GPS가 실패해도 기본 위치로 검색한다', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockRejectedValueOnce(new Error('location off'));
    mockedFetch.mockResolvedValue(okResponse(['동네 맛집']));
    const { renderer } = await renderMap();
    expect(requestedKeywords()).toEqual(['맛집']);
    expect(allText(renderer)).toContain('동네 맛집');
    expect(allText(renderer)).toContain('위치 확인 실패');
  });

  it('평점 없이 분류와 거리만 보여준다', async () => {
    mockedFetch.mockResolvedValue(okResponse(['김치찌개 명가']));
    const { renderer } = await renderMap({ keyword: '김치찌개', requestedAt: 1 });
    expect(allText(renderer)).toContain('한식 • 100m');
    expect(allText(renderer)).not.toContain('⭐');
    expect(allText(renderer)).not.toContain('샘플');
  });

  it('개발용 샘플 응답이면 실제 식당이 아니라고 표시한다', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mock: true, restaurants: [restaurant('[샘플] 김치찌개 식당 1')] }),
    });
    const { renderer } = await renderMap({ keyword: '김치찌개', requestedAt: 1 });
    expect(allText(renderer)).toContain('개발용 샘플 데이터예요. 실제 식당이 아니에요.');
  });

  it('식당 검색이 설정되지 않은 서버(503)도 오류로 보여준다', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'restaurant_search_unavailable' }) });
    const { renderer } = await renderMap();
    expect(allText(renderer)).toContain('식당 정보를 불러오지 못했어요.');
  });

  it('검색 결과가 없으면 안내 문구를 보여준다', async () => {
    mockedFetch.mockResolvedValue(okResponse([]));
    const { renderer } = await renderMap({ keyword: '마라탕', requestedAt: 1 });
    expect(allText(renderer)).toContain('반경 1.5km 안에 마라탕 식당이 없어요.');
  });

  it('기존 restaurant 파라미터로 넘긴 식당도 목록 맨 앞에 보여준다', async () => {
    mockedFetch.mockResolvedValue(okResponse(['동네 맛집']));
    const { renderer, navigation } = await renderMap();
    await act(async () => {
      renderer.update(<MapScreen route={{ params: { restaurant: restaurant('추천 식당') } }} navigation={navigation} />);
    });
    const text = allText(renderer);
    expect(text.indexOf('추천 식당')).toBeGreaterThan(-1);
    expect(text.indexOf('추천 식당')).toBeLessThan(text.indexOf('동네 맛집'));
    expect(requestedKeywords()).toEqual(['맛집']);
  });
});
