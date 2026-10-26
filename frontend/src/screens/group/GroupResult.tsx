import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MENU_DATA, MenuItem } from '../../constants/menuData';
import { GroupMember, GroupResult as GroupScore, groupReasons, scoreGroup } from '../../engine/groupScore';
import { RoomState } from '../../api/roomSocket';
import MiniWorldCup from '../../components/MiniWorldCup';
import { colors, fonts } from '../../theme';
import { gs } from './groupTheme';

interface Props {
  state: RoomState;
  me: number | null;
  onOpenVote: (candidates: string[]) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onVote: (menu: string) => Promise<{ ok: boolean; message?: string }>;
  onFindRestaurants: (menuName: string) => void;
  onRestart: () => void;
}

export const membersFromState = (state: RoomState): GroupMember[] =>
  (state.result?.answers ?? []).map(a => ({
    participantId: a.participantId,
    nickname: a.nickname,
    avoidTags: a.avoidTags ?? [],
    answers: a.answers,
    left: a.left,
  }));

// 후보는 서버가 받은 이름 그대로라서, 이 앱 메뉴 데이터에 없는 이름이 와도 보여줄 수 있게
const toMenuItem = (name: string): MenuItem =>
  MENU_DATA.find(m => m.name === name) ?? ({ ...MENU_DATA[0], name, emoji: '🍽️', desc: '' } as MenuItem);

// 응답이 늦거나 연결이 잠깐 끊겨 투표를 못 열었을 때 다시 시도하는 간격
const VOTE_RETRY_MS = 3000;
const RETRYABLE_VOTE_ERRORS = ['TIMEOUT', 'OFFLINE'];

/**
 * 결과 화면 (US-27~29). 점수는 각 폰이 같은 답으로 똑같이 계산하고,
 * 1·2위가 비슷하면 서버가 여는 4강 투표로 정한다. 투표 우승은 서버가 정해서 모든 폰에 같다.
 */
export default function GroupResult({ state, me, onOpenVote, onVote, onFindRestaurants, onRestart }: Props) {
  const group: GroupScore = useMemo(() => scoreGroup(membersFromState(state)), [state.result]);
  const vote = state.vote;
  const askedForVote = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [myPick, setMyPick] = useState<string | null>(null);

  // 투표가 필요하면 누구든 먼저 연다 (서버는 처음 온 요청만 받고 나머지에는 같은 투표를 돌려준다)
  useEffect(() => {
    // 서버가 다시 떠서 투표가 사라졌으면 다시 열 수 있게
    if (vote) {
      askedForVote.current = false;
      return;
    }
    if (!group.needsVote || askedForVote.current) return;
    askedForVote.current = true;
    onOpenVote(group.voteCandidates).then(ack => {
      if (ack.ok) return;
      if (ack.error && RETRYABLE_VOTE_ERRORS.includes(ack.error)) {
        askedForVote.current = false;
        retryTimer.current = setTimeout(() => setRetryTick(t => t + 1), VOTE_RETRY_MS);
        return;
      }
      setVoteError(ack.message ?? '투표를 열지 못했어요.');
    });
  }, [group.needsVote, vote, retryTick]);

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  const bracketMenus = useMemo(() => (vote ? vote.candidates.map(toMenuItem) : []), [vote?.candidates.join('|')]);

  if (group.ranked.length === 0) {
    return (
      <View>
        <Text style={gs.title}>앗, 고를 메뉴가 없어</Text>
        <Text style={gs.subtitle}>모두의 못 먹는 재료를 빼니 남는 메뉴가 없어요. 조건을 줄여서 다시 해 봐요.</Text>
        <TouchableOpacity style={gs.primary} onPress={onRestart}>
          <Text style={gs.primaryText}>새로 하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 내 요청이 실패했어도 다른 폰이 연 투표가 오면 투표 화면을 보여준다
  const voting = group.needsVote && (vote ? !vote.winner : !voteError);
  if (voting) {
    const voted = me != null && !!vote?.votedIds.includes(me);
    return (
      <View>
        <Text style={gs.title}>막상막하야!</Text>
        <Text style={gs.subtitle}>점수가 비슷한 메뉴끼리 붙여 볼게요. 각자 고른 메뉴가 한 표가 돼요.</Text>
        <View style={gs.card}>
          {!vote ? (
            <Text style={gs.subtitle}>투표 준비 중…</Text>
          ) : voted || myPick ? (
            <>
              <Text style={styles.waitTitle}>내 선택: {myPick ?? '완료'}</Text>
              <Text style={gs.subtitle}>
                {vote.votedIds.length}/{state.participants.length}명 투표했어요. 다 모이면 바로 발표!
              </Text>
            </>
          ) : (
            <MiniWorldCup
              menus={bracketMenus}
              title="우리 중 누구 편이야?"
              onWinner={winner => {
                setMyPick(winner.name);
                onVote(winner.name).then(ack => {
                  // 표가 안 들어갔으면 다시 고르게 한다
                  if (!ack.ok && (ack as any).error !== 'ALREADY_VOTED') setMyPick(null);
                });
              }}
            />
          )}
        </View>
      </View>
    );
  }

  const winnerName = vote?.winner ?? group.ranked[0].item.name;
  // 서버가 정한 우승 메뉴가 이 폰 순위에 없어도 모든 폰이 같은 메뉴를 보여주게 한다
  const rankedWinner = group.ranked.find(r => r.item.name === winnerName);
  const winnerItem = rankedWinner?.item ?? toMenuItem(winnerName);
  const reasons = rankedWinner ? groupReasons(rankedWinner) : [];
  const memberCount = membersFromState(state).filter(m => !m.left).length;
  const others = group.ranked.filter(r => r.item.name !== winnerName).slice(0, 3);

  return (
    <View>
      <Text style={styles.lead}>우리의 메뉴는…</Text>
      <View style={[gs.card, styles.winnerCard]}>
        <View style={styles.winnerImage}>
          <Text style={styles.winnerEmoji}>{winnerItem.emoji}</Text>
        </View>
        <View style={styles.winnerBody}>
          <View style={styles.winnerBadge}><Text style={styles.winnerBadgeText}>같이 고른 메뉴</Text></View>
          <Text style={styles.winnerName}>{winnerItem.name}</Text>
          <Text style={styles.winnerDesc}>{winnerItem.desc}</Text>
        </View>
      </View>

      <View style={gs.card}>
        <Text style={gs.label}>이래서 골랐어</Text>
        <View style={gs.chipRow}>
          {vote?.winner && vote.tally ? (
            <View style={[gs.chip, gs.chipOn]}><Text style={gs.chipText}>🗳 투표 {vote.tally[vote.winner]}표</Text></View>
          ) : null}
          {reasons.map(r => (
            <View key={r.label} style={[gs.chip, gs.chipOn]}>
              <Text style={gs.chipText}>{r.label} · {r.members}/{memberCount}명</Text>
            </View>
          ))}
          {group.avoidTags.length > 0 ? (
            <View style={gs.chip}><Text style={gs.chipText}>{group.avoidTags.join('·')} 빼고</Text></View>
          ) : null}
          {reasons.length === 0 && !vote?.winner ? (
            <View style={gs.chip}><Text style={gs.chipText}>모두에게 무난한 메뉴</Text></View>
          ) : null}
        </View>
      </View>

      <TouchableOpacity style={gs.primary} onPress={() => onFindRestaurants(winnerItem.name)}>
        <Text style={gs.primaryText}>📍 근처 {winnerItem.name} 식당 보기</Text>
      </TouchableOpacity>

      {others.length > 0 ? (
        <View style={gs.card}>
          <Text style={gs.label}>아쉽게 놓친 후보</Text>
          {others.map(r => (
            <Text key={r.item.name} style={styles.other}>{r.item.emoji} {r.item.name}</Text>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={gs.secondary} onPress={onRestart}>
        <Text style={gs.secondaryText}>새로 하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 15, fontFamily: fonts.bold, color: colors.brandText, marginTop: 4, paddingHorizontal: 4 },
  winnerCard: { padding: 0, overflow: 'hidden' },
  winnerImage: { height: 170, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  winnerEmoji: { fontFamily: fonts.body, fontSize: 72 },
  winnerBody: { padding: 20 },
  winnerBadge: { alignSelf: 'flex-start', backgroundColor: colors.brand, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  winnerBadgeText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.onBrand },
  winnerName: { fontSize: 30, lineHeight: 40, letterSpacing: -1, fontFamily: fonts.display, color: colors.ink, marginTop: 8 },
  winnerDesc: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 4 },
  waitTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  other: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 4 },
});
