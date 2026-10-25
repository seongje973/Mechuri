import React, { useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoomState } from '../../api/roomSocket';
import { inviteMessage } from '../../api/rooms';
import { G, gs } from './groupTheme';

interface Props {
  state: RoomState;
  me: number | null;
  onReady: (ready: boolean) => Promise<{ ok: boolean; message?: string }>;
  onStart: () => Promise<{ ok: boolean; message?: string }>;
  onLeave: () => void;
}

const MAX_PARTICIPANTS = 4;
const MIN_TO_START = 2;

/** 대기실: 참가자 목록이 실시간으로 바뀌고, 방장이 시작한다 (US-26) */
export default function GroupLobby({ state, me, onReady, onStart, onLeave }: Props) {
  const [error, setError] = useState<string | null>(null);
  const isHost = state.hostId === me;
  const mine = state.participants.find(p => p.id === me);
  const others = state.participants.filter(p => p.id !== state.hostId);
  const everyoneReady = state.participants.length >= MIN_TO_START && others.every(p => p.connected && p.ready);

  const share = () => {
    Share.share({ message: inviteMessage(state.code) }).catch(() => {});
  };

  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    const ack = await fn();
    if (!ack.ok) setError(ack.message ?? '잠시 후 다시 시도해 주세요.');
  };

  return (
    <View>
      <Text style={gs.title}>대기실</Text>
      <Text style={gs.subtitle}>코드나 링크를 보내서 친구를 불러요. 모두 준비되면 방장이 시작해요.</Text>

      <View style={[gs.card, { alignItems: 'center' }]}>
        <Text style={gs.label}>방 코드</Text>
        <Text style={styles.code} accessibilityLabel={`방 코드 ${state.code.split('').join(' ')}`}>{state.code}</Text>
        <TouchableOpacity style={[gs.primary, { alignSelf: 'stretch' }]} onPress={share}>
          <Text style={gs.primaryText}>초대 링크 보내기</Text>
        </TouchableOpacity>
      </View>

      <View style={gs.card}>
        <Text style={gs.label}>참가자 {state.participants.length}/{MAX_PARTICIPANTS}</Text>
        {state.participants.map(p => {
          const status = !p.connected ? '연결 끊김' : p.id === state.hostId ? '방장' : p.ready ? '준비 완료' : '준비 중';
          return (
            <View key={p.id} style={styles.person}>
              <Text style={styles.avatar}>🐦</Text>
              <Text style={styles.name}>{p.nickname}{p.id === me ? ' (나)' : ''}</Text>
              <Text style={[styles.status, (p.ready || p.id === state.hostId) && p.connected && { color: G.leaf }, !p.connected && { color: G.chili }]}>
                {status}
              </Text>
            </View>
          );
        })}
      </View>

      {isHost ? (
        <TouchableOpacity style={[gs.primary, !everyoneReady && gs.disabled]} disabled={!everyoneReady} onPress={() => act(onStart)}>
          <Text style={gs.primaryText}>
            {state.participants.length < MIN_TO_START ? '친구를 기다리는 중…' : everyoneReady ? '시작하기' : '모두 준비하면 시작할 수 있어요'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={mine?.ready ? gs.secondary : gs.primary} onPress={() => act(() => onReady(!mine?.ready))}>
          <Text style={mine?.ready ? gs.secondaryText : gs.primaryText}>{mine?.ready ? '준비 취소' : '준비 완료'}</Text>
        </TouchableOpacity>
      )}
      {error ? <Text style={gs.error}>{error}</Text> : null}

      <TouchableOpacity onPress={onLeave} style={styles.leave}>
        <Text style={styles.leaveText}>방 나가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 44, fontWeight: '900', letterSpacing: 10, color: G.ink, marginVertical: 4 },
  person: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: G.cream },
  avatar: { fontSize: 22, marginRight: 10 },
  name: { flex: 1, fontSize: 16, color: G.ink, fontWeight: '600' },
  status: { fontSize: 13, color: G.muted, fontWeight: '700' },
  leave: { alignItems: 'center', marginTop: 18, padding: 8 },
  leaveText: { color: G.muted, fontSize: 14, textDecorationLine: 'underline' },
});
