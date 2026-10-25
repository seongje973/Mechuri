import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AVOID_TAG_OPTIONS } from '../../constants/menuData';
import { ROOM_CODE_LENGTH, RoomApiError, RoomMembership, createRoom, getRoom, joinRoom, normalizeRoomCode } from '../../api/rooms';
import { colors, fonts } from '../../theme';
import { gs } from './groupTheme';

interface Props {
  userProfile: any;
  /** 초대 링크로 들어온 방 코드 */
  inviteCode: string | null;
  /** 이전 방이 끝났을 때 보여줄 안내 (만료 등) */
  notice: string | null;
  onEntered: (membership: RoomMembership) => void;
}

const profileAvoidTags = (profile: any): string[] =>
  profile?.avoidTags ? String(profile.avoidTags).split(',').map((t: string) => t.trim()).filter(Boolean) : [];

/** 방 만들기, 또는 코드로 참가. 게스트는 닉네임만 있으면 된다 (US-24, US-25) */
export default function GroupEntry({ userProfile, inviteCode, notice, onEntered }: Props) {
  const [nickname, setNickname] = useState<string>(userProfile?.nickname ?? '');
  const [avoidTags, setAvoidTags] = useState<string[]>(profileAvoidTags(userProfile));
  const [code, setCode] = useState(inviteCode ?? '');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // 초대 링크로 왔으면 방이 살아 있는지 먼저 알려준다 (만료된 링크 안내, US-30)
  useEffect(() => {
    if (!inviteCode) return;
    setCode(inviteCode);
    setInviteError(null);
    getRoom(inviteCode).catch((e: unknown) =>
      setInviteError(e instanceof RoomApiError ? e.message : '방 상태를 확인할 수 없어요. 코드를 확인하고 다시 시도해 주세요.'));
  }, [inviteCode]);

  const toggleTag = (tag: string) =>
    setAvoidTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));

  const trimmed = nickname.trim();
  const normalizedCode = normalizeRoomCode(code);

  const run = async (kind: 'create' | 'join') => {
    if (!trimmed) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    setBusy(kind);
    setError(null);
    try {
      const { membership } = kind === 'create'
        ? await createRoom(trimmed, avoidTags)
        : await joinRoom(normalizedCode, trimmed, avoidTags);
      onEntered(membership);
    } catch (e: any) {
      setError(e instanceof RoomApiError ? e.message : '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <Text style={gs.title}>같이 정하기</Text>
      <Text style={gs.subtitle}>최대 4명이 같은 질문에 답하면, 추리가 모두 무난한 메뉴를 골라줘요.</Text>
      {notice ? <Text style={gs.error}>{notice}</Text> : null}

      <View style={gs.card}>
        <Text style={gs.label}>내 닉네임</Text>
        <TextInput
          style={gs.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="친구들에게 보일 이름"
          placeholderTextColor={colors.muted}
          maxLength={20}
          accessibilityLabel="닉네임"
        />
        <Text style={[gs.label, { marginTop: 14 }]}>못 먹는 거 있어? (한 명이라도 고르면 빼고 추천)</Text>
        <View style={gs.chipRow}>
          {AVOID_TAG_OPTIONS.map(tag => {
            const on = avoidTags.includes(tag);
            return (
              <TouchableOpacity key={tag} style={[gs.chip, on && gs.chipOn]} onPress={() => toggleTag(tag)} accessibilityState={{ selected: on }}>
                <Text style={gs.chipText}>{on ? '✓ ' : ''}{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={gs.card}>
        <Text style={gs.label}>초대받았다면 방 코드</Text>
        <TextInput
          style={[gs.input, { letterSpacing: 6, fontSize: 22, textAlign: 'center', fontFamily: fonts.bold }]}
          value={code}
          onChangeText={v => setCode(normalizeRoomCode(v))}
          placeholder="ABCD"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={ROOM_CODE_LENGTH}
          accessibilityLabel="방 코드"
        />
        {inviteError ? <Text style={gs.error}>{inviteError}</Text> : null}
        <TouchableOpacity
          style={[gs.primary, (normalizedCode.length !== ROOM_CODE_LENGTH || busy !== null) && gs.disabled]}
          disabled={normalizedCode.length !== ROOM_CODE_LENGTH || busy !== null}
          onPress={() => run('join')}
        >
          {busy === 'join' ? <ActivityIndicator color={colors.ink} /> : <Text style={gs.primaryText}>참가하기</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[gs.secondary, busy !== null && gs.disabled]} disabled={busy !== null} onPress={() => run('create')}>
        {busy === 'create' ? <ActivityIndicator color={colors.ink} /> : <Text style={gs.secondaryText}>새 방 만들기</Text>}
      </TouchableOpacity>
      {error ? <Text style={gs.error}>{error}</Text> : null}
    </View>
  );
}
