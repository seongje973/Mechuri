import React from 'react';
import { TouchableOpacity } from 'react-native';
import MenuBracket, { advanceBracket, roundLabel } from '../MenuBracket';

const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;

const menus = (...names: string[]) => names.map(name => ({ name }));
const pickByName = (renderer: any, name: string) => {
  const button = renderer.root.findAllByType(TouchableOpacity).find((b: any) => b.props.accessibilityLabel === `${name} 고르기`);
  if (!button) throw new Error(`no button ${name}`);
  act(() => button.props.onPress());
};

describe('MenuBracket', () => {
  it('4개는 4강 두 판 뒤 결승', () => {
    const onFinish = jest.fn();
    let renderer: any;
    act(() => { renderer = TestRenderer.create(<MenuBracket menus={menus('a', 'b', 'c', 'd')} onFinish={onFinish} />); });
    pickByName(renderer, 'b');
    pickByName(renderer, 'c');
    pickByName(renderer, 'c');
    expect(onFinish).toHaveBeenCalledWith({ name: 'c' });
  });

  it('3개면 남는 하나가 결승으로 바로 간다', () => {
    let state: any = { round: menus('a', 'b', 'c'), winners: [] };
    state = advanceBracket(state, { name: 'a' });
    expect(state.round.map((m: any) => m.name)).toEqual(['a', 'c']);
    state = advanceBracket(state, { name: 'c' });
    expect(state.winner).toEqual({ name: 'c' });
  });

  it('판 이름', () => {
    expect(roundLabel(4)).toBe('4강');
    expect(roundLabel(3)).toBe('4강');
    expect(roundLabel(2)).toBe('결승');
  });
});
