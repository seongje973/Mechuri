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

// 디자인 시안(크림 테마) 색상. 앱 전체 테마 정리 전까지 홈 화면에서만 쓴다.
const C = {
  cream: '#FFF7EC',
  surface: '#FFFFFF',
  shell: '#F3E4CC',
  line: '#EAD9C0',
  ink: '#2E2219',
  muted: '#75604F',
  yolk: '#F5A623',
  yolkDeep: '#D98A0B',
  quail: '#B07A4A',
  feather: '#8A5A32',
  blush: '#F28B6B',
};

export const FALLBACK_RANKING: RankingItem[] = [
  { rank: 1, menuName: '삼겹살', emoji: '🥩', category: '한식', count: 18 },
  { rank: 2, menuName: '짜장면', emoji: '🍜', category: '중식', count: 14 },
  { rank: 3, menuName: '돈까스', emoji: '🍛', category: '일식', count: 11 },
  { rank: 4, menuName: '초밥', emoji: '🍣', category: '일식', count: 9 },
  { rank: 5, menuName: '피자', emoji: '🍕', category: '양식', count: 6 }
];

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

  // 랭킹 정보 조회
  const fetchRanking = async () => {
    try {
      setLoadingRanking(true);
      const response = await apiFetch(`/api/restaurants/ranking`);
      if (response.ok) {
        const data = await response.json();
        setRankingList(data.ranking || []);
      } else {
        setRankingList(FALLBACK_RANKING);
      }
    } catch (e) {
      console.log('⚠️ Failed to fetch ranking from server, applying client fallback');
      setRankingList(FALLBACK_RANKING);
    } finally {
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
          <TouchableOpacity onPress={fetchRanking} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>새로고침</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rankingCard}>
          {loadingRanking ? (
            <View style={styles.rankingLoading}>
              <ActivityIndicator size="small" color={C.yolkDeep} />
              <Text style={styles.rankingLoadingText}>랭킹을 불러오는 중이에요</Text>
            </View>
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
    backgroundColor: C.cream,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.feather,
    letterSpacing: 1,
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  profileEmoji: {
    fontSize: 20,
  },
  hero: {
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 28,
  },
  bubble: {
    backgroundColor: C.shell,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    maxWidth: '100%',
  },
  bubbleText: {
    color: C.ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 12,
    height: 12,
    backgroundColor: C.shell,
    transform: [{ rotate: '45deg' }],
  },
  ctaButton: {
    alignSelf: 'stretch',
    backgroundColor: C.yolk,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: C.yolkDeep,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 18,
  },
  ctaText: {
    color: C.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ctaHint: {
    color: C.muted,
    fontSize: 12.5,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 12,
  },
  sectionTitleInline: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  subCard: {
    width: '48%',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
    borderBottomWidth: 4,
  },
  subEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 4,
  },
  subDesc: {
    fontSize: 12,
    color: C.muted,
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
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  rankingCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 20,
  },
  rankingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  rankingLoadingText: {
    color: C.muted,
    fontSize: 12,
    marginLeft: 8,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  rankingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rankNumber: {
    width: 22,
    fontSize: 14,
    fontWeight: '900',
    color: C.muted,
    textAlign: 'center',
  },
  rankTop: {
    color: C.yolkDeep,
  },
  rankMenuEmoji: {
    fontSize: 20,
    marginHorizontal: 10,
  },
  rankMenuName: {
    flex: 1,
    color: C.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  rankMenuCategory: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.shell,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  loginText: {
    flex: 1,
    color: C.ink,
    fontSize: 12.5,
    lineHeight: 18,
    paddingRight: 8,
  },
  loginGo: {
    color: C.feather,
    fontSize: 13,
    fontWeight: '800',
  },
});

const quail = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  plume: {
    fontSize: 26,
    fontWeight: '900',
    color: C.feather,
    marginBottom: -8,
  },
  body: {
    width: 104,
    height: 92,
    borderRadius: 52,
    backgroundColor: C.quail,
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
    backgroundColor: C.cream,
  },
  eye: {
    position: 'absolute',
    top: 30,
    width: 9,
    height: 11,
    borderRadius: 5,
    backgroundColor: C.ink,
  },
  cheek: {
    position: 'absolute',
    top: 44,
    width: 12,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.blush,
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
    backgroundColor: C.yolk,
  },
});
