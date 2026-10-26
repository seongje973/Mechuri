import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoomMembership, clearMembership, loadMembership } from '../api/rooms';
import { useRoomConnection } from '../api/roomSocket';
import GroupEntry from './group/GroupEntry';
import GroupLobby from './group/GroupLobby';
import GroupQuestion from './group/GroupQuestion';
import GroupResult from './group/GroupResult';
import { colors, fonts } from '../theme';
import { gs } from './group/groupTheme';

interface Props {
  navigation: any;
  route?: { params?: { inviteCode?: string; invitedAt?: number } };
  isLoggedIn?: boolean;
  userProfile?: any;
}

/**
 * 같이 정하기 (US-25~30). 방 만들기/참가 → 대기실 → 같은 질문 → 결과.
 * 참가 정보는 기기에 저장해 두고, 앱을 다시 열면 같은 방으로 다시 들어간다.
 */
export default function GroupScreen({ navigation, route, userProfile }: Props) {
  const insets = useSafeAreaInsets();
  const [membership, setMembership] = useState<RoomMembership | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const room = useRoomConnection(membership?.token ?? null);

  const inviteCode = route?.params?.inviteCode ?? null;
  const invitedAt = route?.params?.invitedAt;

  useEffect(() => {
    loadMembership()
      .then(saved => setMembership(saved))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // 다른 방 초대 링크를 열면 지금 방 대신 그 방 참가 화면을 보여준다.
  // 저장된 참가 정보는 새 방에 실제로 들어갈 때(createRoom/joinRoom) 바뀌므로 여기서는 지우지 않는다
  useEffect(() => {
    if (!inviteCode || !loaded) return;
    if (membership && membership.code !== inviteCode) {
      setMembership(null);
    }
  }, [inviteCode, invitedAt, loaded]);

  // 만료되었거나 더 이상 참가자가 아니면 처음 화면으로 (US-30)
  useEffect(() => {
    if (!room.fatal) return;
    setNotice(room.fatal.message);
    setMembership(null);
    clearMembership().catch(() => {});
  }, [room.fatal]);

  const reset = useCallback(async () => {
    await room.leave();
    await clearMembership().catch(() => {});
    setMembership(null);
    setNotice(null);
  }, [room.leave]);

  const findRestaurants = (menuName: string) =>
    navigation.navigate('지도', { keyword: menuName, requestedAt: Date.now() });

  let body: React.ReactNode;
  if (!loaded) {
    body = <ActivityIndicator color={colors.brandText} style={{ marginTop: 60 }} />;
  } else if (!membership) {
    body = (
      <GroupEntry
        userProfile={userProfile}
        inviteCode={inviteCode}
        notice={notice}
        onEntered={m => {
          setNotice(null);
          setMembership(m);
        }}
      />
    );
  } else if (!room.state) {
    body = (
      <View style={{ alignItems: 'center', marginTop: 60 }}>
        <ActivityIndicator color={colors.brandText} />
        <Text style={gs.subtitle}>방 {membership.code}에 연결하는 중…</Text>
        <TouchableOpacity onPress={reset} style={{ marginTop: 20, padding: 8 }}>
          <Text style={{ color: colors.muted, textDecorationLine: 'underline' }}>그만두고 처음으로</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (room.state.status === 'waiting') {
    body = <GroupLobby state={room.state} me={room.participantId} onReady={room.setReady} onStart={room.start} onLeave={reset} />;
  } else if (room.state.status === 'playing') {
    body = <GroupQuestion state={room.state} me={room.participantId} onAnswer={room.answer} onSkip={room.next} onLeave={reset} />;
  } else {
    body = (
      <GroupResult
        state={room.state}
        me={room.participantId}
        onOpenVote={room.openVote}
        onVote={room.vote}
        onFindRestaurants={findRestaurants}
        onRestart={reset}
      />
    );
  }

  return (
    <View style={[gs.screen, { paddingTop: insets.top }]}>
      {membership && room.state && !room.connected ? (
        <View style={{ backgroundColor: colors.fill, padding: 8 }}>
          <Text style={{ textAlign: 'center', color: colors.brandText, fontFamily: fonts.body, fontSize: 13 }}>연결이 끊겼어요. 다시 연결하는 중…</Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={gs.scroll} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
    </View>
  );
}
