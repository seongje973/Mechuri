import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TasteSheet from '../TasteSheet';

jest.mock('../../storage/userData', () => ({
  getAvoidTags: jest.fn(async () => ['오이']),
  getPreferences: jest.fn(async () => ({ likedCuisines: ['한식'], spicy: null })),
  setAvoidTags: jest.fn(async (tags: string[]) => tags),
  setPreferences: jest.fn(async (prefs: unknown) => prefs),
}));

const storage = jest.requireMock('../../storage/userData');

describe('TasteSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('저장된 값을 불러와 고친 뒤 기피 태그와 취향을 함께 저장한다', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    render(<TasteSheet visible mode="login" onClose={onClose} onSaved={onSaved} />);

    await screen.findByText('✓ 오이');
    fireEvent.press(screen.getByText('갑각류'));
    fireEvent.press(screen.getByText('일식'));
    fireEvent.press(screen.getByText('매운 거 좋아요'));
    fireEvent.press(screen.getByText('저장하기'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(storage.setAvoidTags).toHaveBeenCalledWith(['오이', '갑각류']);
    expect(storage.setPreferences).toHaveBeenCalledWith({ likedCuisines: ['한식', '일식'], spicy: 'hot' });
    expect(onSaved).toHaveBeenCalledWith(['오이', '갑각류'], { likedCuisines: ['한식', '일식'], spicy: 'hot' });
  });

  it('매운맛을 안 먹는다고 고르면 매운맛 정도는 묻지 않는다', async () => {
    render(<TasteSheet visible mode="edit" onClose={jest.fn()} />);
    await screen.findByText('✓ 오이');
    expect(screen.getByText('보통이에요')).toBeTruthy();
    fireEvent.press(screen.getByText('매운맛'));
    expect(screen.queryByText('보통이에요')).toBeNull();
  });

  it('저장된 값을 못 읽으면 빈 값으로 덮어쓰지 않도록 저장을 막는다', async () => {
    storage.getAvoidTags.mockRejectedValueOnce(new Error('offline'));
    render(<TasteSheet visible mode="edit" onClose={jest.fn()} />);
    await screen.findByText(/불러오지 못했어요/);
    fireEvent.press(screen.getByText('저장하기'));
    expect(storage.setAvoidTags).not.toHaveBeenCalled();
  });
});
