import React from 'react';
import { Text } from 'react-native';
import GroupResult from '../group/GroupResult';
import { RoomState } from '../../api/roomSocket';
import MenuBracket from '../../components/MenuBracket';

const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;

const textOf = (renderer: any) =>
  renderer.root.findAllByType(Text).map((t: any) => (Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children))).join('\n');

const finishedState = (answers: [string, any][][], vote: RoomState['vote'] = null): RoomState => ({
  code: 'ABCD', status: 'finished', expiresAt: '', hostId: 1, question: null, vote,
  participants: answers.map((_, i) => ({ id: i + 1, nickname: `p${i + 1}`, ready: true, connected: true, away: false })),
  result: {
    questionIds: [],
    answers: answers.map((list, i) => ({
      participantId: i + 1, nickname: `p${i + 1}`, left: false, avoidTags: [],
      answers: list.map(([questionId, answer]) => ({ questionId, answer })),
    })),
  },
});

const render = (state: RoomState, overrides: any = {}) => {
  const props = {
    me: 1,
    onOpenVote: jest.fn().mockResolvedValue({ ok: true }),
    onVote: jest.fn().mockResolvedValue({ ok: true }),
    onFindRestaurants: jest.fn(),
    onRestart: jest.fn(),
    ...overrides,
  };
  let renderer: any;
  act(() => { renderer = TestRenderer.create(<GroupResult state={state} {...props} />); });
  return { renderer, props };
};

describe('GroupResult', () => {
  it('비슷한 점수면 투표를 열고 4강을 보여준다', async () => {
    const { renderer, props } = render(finishedState([[], []]));
    await act(async () => {});
    expect(props.onOpenVote).toHaveBeenCalledTimes(1);
    expect(props.onOpenVote.mock.calls[0][0]).toHaveLength(4);

    const candidates = props.onOpenVote.mock.calls[0][0];
    act(() => renderer.update(
      <GroupResult state={finishedState([[], []], { candidates, deadline: 1, votedIds: [], winner: null, tally: null })} {...props} />
    ));
    expect(renderer.root.findAllByType(MenuBracket)).toHaveLength(1);
  });

  it('서버가 정한 우승 메뉴를 보여주고 근처 식당으로 보낸다', () => {
    const vote = { candidates: ['짜장면', '김치찌개'], deadline: null, votedIds: [1, 2], winner: '김치찌개', tally: { 짜장면: 1, 김치찌개: 1 } };
    const { renderer, props } = render(finishedState([[], []], vote));
    const text = textOf(renderer);
    expect(text).toContain('우리의 메뉴는…');
    expect(text).toContain('김치찌개');
    expect(props.onOpenVote).not.toHaveBeenCalled();
    const button = renderer.root.findAll((n: any) => n.props.onPress && textOf({ root: n }).includes('식당 보기'))[0];
    act(() => button.props.onPress());
    expect(props.onFindRestaurants).toHaveBeenCalledWith('김치찌개');
  });
});
