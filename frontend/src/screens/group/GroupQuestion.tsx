import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { QUESTIONS } from '../../constants/akinatorQuestions';
import { ScoreAnswer } from '../../engine/config';
import { RoomState } from '../../api/roomSocket';
import { G, gs } from './groupTheme';

interface Props {
  state: RoomState;
  me: number | null;
  onAnswer: (questionId: string, answer: ScoreAnswer) => Promise<{ ok: boolean; message?: string }>;
  onSkip: () => void;
  onLeave: () => void;
}

export const ANSWER_OPTIONS: { answer: ScoreAnswer; label: string }[] = [
  { answer: 'yes', label: '응' },
  { answer: 'probably', label: '아마도' },
  { answer: 'dontcare', label: '상관없어' },
  { answer: 'no', label: '아니' },
];

const secondsLeft = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

/** 모두 같은 질문에 답한다. 다 답하거나 30초가 지나면 서버가 다음 질문을 보낸다 (US-26) */
export default function GroupQuestion({ state, me, onAnswer, onSkip, onLeave }: Props) {
  const question = state.question;
  const [left, setLeft] = useState(question ? secondsLeft(question.deadline) : 0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!question) return;
    setLeft(secondsLeft(question.deadline));
    setError(null);
    const timer = setInterval(() => setLeft(secondsLeft(question.deadline)), 1000);
    return () => clearInterval(timer);
  }, [question?.questionId, question?.deadline]);

  if (!question) return <Text style={gs.subtitle}>다음 질문을 기다리는 중…</Text>;

  const text = QUESTIONS.find(q => q.id === question.questionId)?.text ?? '다음 질문';
  const answered = me != null && question.answeredIds.includes(me);
  const isHost = state.hostId === me;

  const send = async (answer: ScoreAnswer) => {
    setSending(true);
    const ack = await onAnswer(question.questionId, answer);
    setSending(false);
    // 이미 다음 질문으로 넘어간 경우는 조용히 무시한다
    if (!ack.ok && !['STALE_QUESTION', 'ALREADY_ANSWERED'].includes((ack as any).error)) setError(ack.message ?? '다시 눌러 주세요.');
  };

  return (
    <View>
      <View style={styles.top}>
        <Text style={styles.progress}>질문 {question.index + 1}/{question.total}</Text>
        <Text style={[styles.timer, left <= 5 && { color: G.chili }]}>⏱ {left}초</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${((question.index + (answered ? 1 : 0)) / question.total) * 100}%` }]} />
      </View>

      <View style={[gs.card, styles.questionCard]}>
        <Text style={styles.mascot}>🐦 추리</Text>
        <Text style={styles.question}>{text}</Text>
      </View>

      {answered ? (
        <Text style={gs.mascot}>좋아, 다른 친구들 답 기다리는 중이야…</Text>
      ) : (
        ANSWER_OPTIONS.map(({ answer, label }) => (
          <TouchableOpacity key={answer} style={[gs.secondary, sending && gs.disabled]} disabled={sending} onPress={() => send(answer)}>
            <Text style={gs.secondaryText}>{label}</Text>
          </TouchableOpacity>
        ))
      )}
      {error ? <Text style={gs.error}>{error}</Text> : null}

      <View style={gs.card}>
        <Text style={gs.label}>답한 사람</Text>
        <View style={gs.chipRow}>
          {state.participants.map(p => {
            const done = question.answeredIds.includes(p.id);
            return (
              <View key={p.id} style={[gs.chip, done && gs.chipOn]}>
                <Text style={gs.chipText}>{done ? '✓ ' : p.away || !p.connected ? '… ' : ''}{p.nickname}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        {isHost ? (
          <TouchableOpacity onPress={onSkip} style={styles.link}>
            <Text style={styles.linkText}>기다리지 않고 넘기기</Text>
          </TouchableOpacity>
        ) : <View />}
        <TouchableOpacity onPress={onLeave} style={styles.link}>
          <Text style={styles.linkText}>방 나가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { fontSize: 14, fontWeight: '800', color: G.muted },
  timer: { fontSize: 14, fontWeight: '800', color: G.feather },
  bar: { height: 8, borderRadius: 999, backgroundColor: G.shell, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: G.yolk },
  questionCard: { paddingVertical: 28, alignItems: 'center' },
  mascot: { fontSize: 13, color: G.quail, fontWeight: '700' },
  question: { fontSize: 22, fontWeight: '800', color: G.ink, textAlign: 'center', marginTop: 10, lineHeight: 30 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  link: { padding: 8 },
  linkText: { color: G.muted, fontSize: 14, textDecorationLine: 'underline' },
});
