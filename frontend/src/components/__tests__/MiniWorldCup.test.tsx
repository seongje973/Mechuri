import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MiniWorldCup from '../MiniWorldCup';
import { MENU_DATA } from '../../constants/menuData';

describe('MiniWorldCup', () => {
  it('4개 중 3번 골라 우승 메뉴를 알려 준다', () => {
    const menus = MENU_DATA.slice(0, 4);
    const onWinner = jest.fn();
    render(<MiniWorldCup menus={menus} onWinner={onWinner} />);

    expect(screen.getByText('4강 · 1번째')).toBeTruthy();
    fireEvent.press(screen.getByText(menus[0].name));
    fireEvent.press(screen.getByText(menus[3].name));
    expect(screen.getByText('결승 · 1번째')).toBeTruthy();
    fireEvent.press(screen.getByText(menus[3].name));

    expect(onWinner).toHaveBeenCalledWith(menus[3]);
  });

  it('3개면 마지막 메뉴는 부전승으로 결승에 간다', () => {
    const menus = MENU_DATA.slice(0, 3);
    const onWinner = jest.fn();
    render(<MiniWorldCup menus={menus} onWinner={onWinner} />);
    fireEvent.press(screen.getByText(menus[1].name));
    fireEvent.press(screen.getByText(menus[2].name));
    expect(onWinner).toHaveBeenCalledWith(menus[2]);
  });
});
