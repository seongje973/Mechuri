import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { apiFetch } from '../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, layout, radii, spacing, typography } from '../theme';

interface HomeScreenProps {
  navigation: any;
  isLoggedIn: boolean;
  userProfile: any;
}

interface RankingItem {
  rank: number;
  menuName: string;
  emoji: string;
  category: string;
  count: number;
}


// 시간대별 인사. 마스코트 추리는 반말로 말한다.
export const getGreeting = (hour: number = new Date().getHours()) => {
  if (hour < 11) return '좋은 아침! 첫 끼 뭐 먹을지 내가 맞혀볼게.';
  if (hour < 15) return '점심 고민 중이지? 내가 맞혀볼게.';
  if (hour < 18) return '출출하지? 간식이든 밥이든 맞혀볼게.';
  return '저녁 아직이지? 오늘 메뉴, 내가 맞혀볼게.';
};

// 탐정 메추리 "추리". 이미지 에셋이 생기기 전까지 도형으로 그린다.
function Quail() {
  return (
    <View style={quail.wrap}>
      <Text style={quail.plume}>?</Text>
      <View style={quail.body}>
        <View style={quail.belly} />
        <View style={[quail.eye, { left: 26 }]} />
        <View style={[quail.eye, { right: 26 }]} />
        <View style={[quail.cheek, { left: 16 }]} />
        <View style={[quail.cheek, { right: 16 }]} />
        <View style={quail.beak} />
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation, isLoggedIn, userProfile }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [rankingList, setRankingList] = useState<RankingItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState<boolean>(true);
  const [rankingFailed, setRankingFailed] = useState<boolean>(false);

  // 랭킹 정보 조회. 실제 기록만 보여 주고, 못 불러오면 지어낸 숫자 대신 그 사실을 알린다
  const fetchRanking = async () => {
    // 응답 본문을 다 읽을 때까지 8초로 묶는다. 그래야 로딩이 끝나고 새로고침 버튼이 다시 켜진다
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      setLoadingRanking(true);
      setRankingFailed(false);
      const response = await apiFetch(`/api/restaurants/ranking`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setRankingList(data.ranking || []);
    } catch (e) {
      console.log('⚠️ Failed to fetch ranking from server');
      setRankingList([]);
      setRankingFailed(true);
    } finally {
      clearTimeout(timeoutId);
      setLoadingRanking(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  // autoStart: 추천 화면이 소개 단계를 건너뛰고 바로 첫 질문을 띄우도록 하는 신호 (US-19: 첫 질문까지 탭 1번)
  const startRecommend = () => navigation.navigate('메뉴 추천', { autoStart: Date.now() });

  const nickname = isLoggedIn && userProfile?.nickname ? userProfile.nickname : null;

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>메추리</Text>
          <TouchableOpacity
            style={styles.profileBadge}
            onPress={() => navigation.navigate('마이페이지')}
            accessibilityLabel="내 정보"
          >
            <Text style={styles.profileEmoji}>{isLoggedIn ? '😋' : '👤'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero: 바로 추천 */}
        <View style={styles.hero}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              {nickname ? `${nickname}, ` : ''}{getGreeting()}
            </Text>
            <View style={styles.bubbleTail} />
          </View>
          <Quail />
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={startRecommend}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>바로 추천</Text>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>질문 몇 개에 답하면 오늘 메뉴를 골라 드려요.</Text>
        </View>

        {/* 보조 영역: 다른 방법 */}
        <Text style={styles.sectionTitle}>다른 방법으로 정하기</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => navigation.navigate('월드컵')}
            activeOpacity={0.85}
          >
            <Text style={styles.subEmoji}>🏆</Text>
            <Text style={styles.subTitle}>메뉴 월드컵</Text>
            <Text style={styles.subDesc}>둘 중 하나씩 골라요</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => navigation.navigate('지도')}
            activeOpacity={0.85}
          >
            <Text style={styles.subEmoji}>📍</Text>
            <Text style={styles.subTitle}>주변 식당</Text>
            <Text style={styles.subDesc}>지도에서 바로 찾아요</Text>
          </TouchableOpacity>
        </View>

        {/* 보조 영역: 인기 랭킹 */}
        <View style={styles.rankingHeaderRow}>
          <Text style={styles.sectionTitleInline}>요즘 많이 고른 메뉴</Text>
          <TouchableOpacity onPress={fetchRanking} disabled={loadingRanking} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>새로고침</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rankingCard}>
          {loadingRanking ? (
            <View style={styles.rankingLoading}>
              <ActivityIndicator size="small" color={colors.yolkDeep} />
              <Text style={styles.rankingLoadingText}>랭킹을 불러오는 중이에요</Text>
            </View>
          ) : rankingList.length === 0 ? (
            <Text style={styles.rankingEmptyText}>
              {rankingFailed ? '랭킹을 불러오지 못했어요. 잠시 후 새로고침해 주세요.' : '아직 데이터가 없어요. 첫 기록을 남겨 보세요!'}
            </Text>
          ) : (
            rankingList.map((item, idx) => (
              <View
                key={`${item.rank}-${item.menuName}`}
                style={[
                  styles.rankingRow,
                  idx !== rankingList.length - 1 && styles.rankingBorder
                ]}
              >
                <Text style={[styles.rankNumber, item.rank <= 3 && styles.rankTop]}>{item.rank}</Text>
                <Text style={styles.rankMenuEmoji}>{item.emoji}</Text>
                <Text style={styles.rankMenuName}>{item.menuName}</Text>
                <Text style={styles.rankMenuCategory}>{item.category}</Text>
              </View>
            ))
          )}
        </View>

        {!isLoggedIn && (
          <TouchableOpacity
            style={styles.loginCard}
            onPress={() => navigation.navigate('마이페이지')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginText}>카카오로 로그인하면 먹은 기록과 취향이 저장돼요.</Text>
            <Text style={styles.loginGo}>로그인 ›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    ...typography.title,
    color: colors.feather,
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  profileEmoji: {
    fontSize: 20,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 28,
  },
  bubble: {
    backgroundColor: colors.shell,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    maxWidth: '100%',
  },
  bubbleText: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 12,
    height: 12,
    backgroundColor: colors.shell,
    transform: [{ rotate: '45deg' }],
  },
  ctaButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.yolk,
    borderRadius: radii.md,
    borderBottomWidth: 4,
    borderBottomColor: colors.yolkDeep,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 18,
  },
  ctaText: {
    ...typography.button,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  ctaHint: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 10,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  sectionTitleInline: {
    ...typography.heading,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  subCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomWidth: 4,
  },
  subEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.ink,
    marginBottom: 4,
  },
  subDesc: {
    ...typography.caption,
    color: colors.muted,
  },
  rankingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshBtnText: {
    ...typography.caption,
    color: colors.muted,
  },
  rankingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 20,
  },
  rankingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  rankingLoadingText: {
    ...typography.caption,
    color: colors.muted,
    marginLeft: spacing.sm,
  },
  rankingEmptyText: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  rankingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rankNumber: {
    width: 22,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.muted,
    textAlign: 'center',
  },
  rankTop: {
    color: colors.yolkDeep,
  },
  rankMenuEmoji: {
    fontSize: 20,
    marginHorizontal: 10,
  },
  rankMenuName: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  rankMenuCategory: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shell,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
  },
  loginText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    paddingRight: spacing.sm,
  },
  loginGo: {
    color: colors.feather,
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});

const quail = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  plume: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.feather,
    marginBottom: -8,
  },
  body: {
    width: 104,
    height: 92,
    borderRadius: 52,
    backgroundColor: colors.quail,
  },
  belly: {
    position: 'absolute',
    bottom: 0,
    left: 18,
    right: 18,
    height: 46,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: colors.cream,
  },
  eye: {
    position: 'absolute',
    top: 30,
    width: 9,
    height: 11,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  cheek: {
    position: 'absolute',
    top: 44,
    width: 12,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.blush,
    opacity: 0.7,
  },
  beak: {
    position: 'absolute',
    top: 42,
    alignSelf: 'center',
    left: 46,
    width: 12,
    height: 9,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: colors.yolk,
  },
});
