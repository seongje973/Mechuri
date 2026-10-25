import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  ActivityIndicator
} from 'react-native';
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

export default function HomeScreen({ navigation, isLoggedIn, userProfile }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [rankingList, setRankingList] = useState<RankingItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState<boolean>(true);

  // 랭킹 정보 조회
  const fetchRanking = async () => {
    try {
      setLoadingRanking(true);
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const response = await fetch(`http://${ip}:5000/api/restaurants/ranking`);
      if (response.ok) {
        const data = await response.json();
        setRankingList(data.ranking || []);
      } else {
        setRankingList(getFallbackRanking());
      }
    } catch (e) {
      console.log('⚠️ Failed to fetch ranking from server, applying client fallback');
      setRankingList(getFallbackRanking());
    } finally {
      setLoadingRanking(false);
    }
  };

  const getFallbackRanking = (): RankingItem[] => [
    { rank: 1, menuName: '삼겹살', emoji: '🥩', category: '한식', count: 18 },
    { rank: 2, menuName: '짜장면', emoji: '🍜', category: '중식', count: 14 },
    { rank: 3, menuName: '돈까스', emoji: '🍛', category: '일식', count: 11 },
    { rank: 4, menuName: '초밥', emoji: '🍣', category: '일식', count: 9 },
    { rank: 5, menuName: '피자', emoji: '🍕', category: '양식', count: 6 }
  ];

  useEffect(() => {
    fetchRanking();
  }, []);

  // Simple check for time of day to display dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return '상쾌한 아침, 오늘 첫 끼는?';
    if (hour < 15) return '즐거운 점심, 오늘 점심 뭐 먹지?';
    if (hour < 18) return '출출한 오후, 맛있는 간식 타임?';
    return '행복한 저녁, 오늘 저녁은 결정하셨나요?';
  };

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
          <View>
            <Text style={styles.appTitle}>🍲 메추리</Text>
            <Text style={styles.greeting}>{getGreeting()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileBadge}
            onPress={() => navigation.navigate('마이페이지')}
          >
            <Text style={styles.profileEmoji}>😋</Text>
          </TouchableOpacity>
        </View>

        {/* Banner Card / Shortcut Recommendation */}
        <View style={styles.glassCard}>
          <View style={styles.bannerRow}>
            <Text style={styles.bannerBadge}>오늘의 추천 테마 🌧️</Text>
          </View>
          <Text style={styles.bannerTitle}>비 오는 날엔 역시 따뜻한 국물 요리!</Text>
          <Text style={styles.bannerDesc}>
            오늘 같이 흐리고 비가 오는 날에는 칼칼하고 따뜻한 김치찌개나 짬뽕 어떠신가요?
          </Text>
          <TouchableOpacity 
            style={styles.bannerButton}
            onPress={() => navigation.navigate('메뉴 추천')}
          >
            <Text style={styles.bannerButtonText}>추천 메뉴 더 보기</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Real-time Ranking Board */}
        <View style={styles.rankingSection}>
          <View style={styles.rankingHeaderRow}>
            <Text style={styles.sectionTitle}>🔥 실시간 인기 메뉴 TOP 5</Text>
            <TouchableOpacity onPress={fetchRanking} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>새로고침 🔄</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.rankingCard}>
            {loadingRanking ? (
              <View style={styles.rankingLoading}>
                <ActivityIndicator size="small" color="#fbbf24" />
                <Text style={styles.rankingLoadingText}>실시간 랭킹 집계 중...</Text>
              </View>
            ) : (
              rankingList.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.rankingRow,
                    idx !== rankingList.length - 1 && styles.rankingBorder
                  ]}
                  onPress={() => navigation.navigate('메뉴 추천')}
                  activeOpacity={0.8}
                >
                  <View style={styles.rankBadgeRow}>
                    <Text style={[
                      styles.rankNumber,
                      item.rank === 1 && styles.rankGold,
                      item.rank === 2 && styles.rankSilver,
                      item.rank === 3 && styles.rankBronze,
                    ]}>
                      {item.rank === 1 ? '👑 1' : `${item.rank}`}
                    </Text>
                    <Text style={styles.rankMenuEmoji}>{item.emoji}</Text>
                    <View style={styles.rankMenuInfo}>
                      <Text style={styles.rankMenuName}>{item.menuName}</Text>
                      <Text style={styles.rankMenuCategory}>{item.category}</Text>
                    </View>
                  </View>
                  <View style={styles.rankCountWrapper}>
                    <Text style={styles.rankCountText}>{item.count}회 선택됨</Text>
                    <Text style={styles.rankArrow}>➔</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Section: Core Features */}
        <Text style={styles.sectionTitle}>🎯 결정 장애 해결소</Text>

        <View style={styles.row}>
          {/* Roulette Card */}
          <TouchableOpacity 
            style={[styles.featureCard, styles.goldCard]} 
            onPress={() => navigation.navigate('메뉴 추천')}
            activeOpacity={0.8}
          >
            <Text style={styles.featureEmoji}>🍔</Text>
            <Text style={styles.featureTitle}>메뉴 추천 서비스</Text>
            <Text style={styles.featureDesc}>룰렛, 퀴즈, 월드컵으로 완벽한 한 끼 선택!</Text>
            <View style={styles.actionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Map Card */}
          <TouchableOpacity 
            style={[styles.featureCard, styles.amberCard]} 
            onPress={() => navigation.navigate('지도')}
            activeOpacity={0.8}
          >
            <Text style={styles.featureEmoji}>📍</Text>
            <Text style={styles.featureTitle}>주변 식당 지도</Text>
            <Text style={styles.featureDesc}>추천받은 맛집을 즉시 지도에서 확인!</Text>
            <View style={styles.actionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Mood Shortcuts */}
        <Text style={styles.sectionTitle}>🔥 지금 내 상태는?</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>🌶️</Text>
            <Text style={styles.moodText}>매운 게 당겨</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>🥗</Text>
            <Text style={styles.moodText}>가볍게 먹고파</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>💸</Text>
            <Text style={styles.moodText}>가성비 최고</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>🥩</Text>
            <Text style={styles.moodText}>플렉스 할래</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* History / Analytics Quick Preview */}
        {isLoggedIn ? (
          <TouchableOpacity 
            style={styles.historyPreviewCard}
            onPress={() => navigation.navigate('마이페이지')}
          >
            <View style={styles.historyRow}>
              <View>
                <Text style={styles.historyTitle}>📅 최근에 먹은 메뉴 & 마이페이지</Text>
                <Text style={styles.historyDesc}>식사 히스토리를 확인하고 취향을 관리해 보세요.</Text>
              </View>
              <Text style={styles.historyArrow}>➔</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.historyPreviewCard, styles.goldPromoCard]}
            onPress={() => navigation.navigate('마이페이지')}
          >
            <View style={styles.historyRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.promoTitle}>🐣 메추리 요정의 미식 분석</Text>
                <Text style={styles.promoDesc}>3초 카카오 연동으로 내가 먹은 식단 분석과 알레르기 필터를 이용해 보세요!</Text>
              </View>
              <View style={styles.promoGoBadge}>
                <Text style={styles.promoGoText}>로그인 ➔</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>MeChuri - premium food recommendation app</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#1c1917', // Warm Dark Stone Onyx (따뜻한 블랙/돌색)
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fbbf24', // Warm Amber Gold
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 15,
    color: '#cbd5e1',
    marginTop: 4,
    fontWeight: '500',
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(44, 40, 38, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)', // Gold border
  },
  profileEmoji: {
    fontSize: 22,
  },
  glassCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.75)', // Warm dark stone card
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.12)', // Subtle Gold border
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  bannerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bannerBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    color: '#fbbf24', // Amber Gold
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#a8a29e', // Soft warm gray
    lineHeight: 20,
    marginBottom: 18,
  },
  bannerButton: {
    backgroundColor: '#f59e0b', // Vibrant Gold
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  featureCard: {
    width: '48%',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  goldCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.06)', // Golden card
    borderColor: 'rgba(251, 191, 36, 0.18)',
  },
  amberCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)', // Amber card
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  featureEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 11,
    color: '#a8a29e',
    lineHeight: 16,
    height: 48,
  },
  actionArrow: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  arrowText: {
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  horizontalScroll: {
    paddingRight: 20,
    marginBottom: 32,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(41, 37, 36, 0.6)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
  },
  moodEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  moodText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  historyPreviewCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.4)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
    marginBottom: 24,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  historyDesc: {
    fontSize: 11,
    color: '#78716c', // Soft warm stone gray
  },
  historyArrow: {
    color: '#fbbf24',
    fontSize: 16,
  },
  footer: {
    textAlign: 'center',
    color: '#44403c',
    fontSize: 11,
    marginVertical: 10,
  },
  goldPromoCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1,
  },
  promoTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#fbbf24',
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 11.5,
    color: '#a8a29e',
    lineHeight: 16,
  },
  promoGoBadge: {
    backgroundColor: '#fbbf24',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  promoGoText: {
    color: '#1c1917',
    fontSize: 11.5,
    fontWeight: '800',
  },
  // Ranking Section Styles
  rankingSection: {
    marginBottom: 32,
  },
  rankingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshBtnText: {
    color: '#a8a29e',
    fontSize: 12,
    fontWeight: '600',
  },
  rankingCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.75)',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  rankingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  rankingLoadingText: {
    color: '#a8a29e',
    fontSize: 12,
    marginLeft: 8,
  },
  rankingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rankingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#a8a29e',
    width: 38,
    textAlign: 'center',
  },
  rankGold: {
    color: '#fbbf24', // Gold
  },
  rankSilver: {
    color: '#e2e8f0', // Silver
  },
  rankBronze: {
    color: '#b45309', // Bronze
  },
  rankMenuEmoji: {
    fontSize: 24,
    marginHorizontal: 10,
  },
  rankMenuInfo: {
    justifyContent: 'center',
  },
  rankMenuName: {
    color: '#f8fafc',
    fontSize: 14.5,
    fontWeight: '800',
  },
  rankMenuCategory: {
    color: '#78716c',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  rankCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankCountText: {
    color: '#a8a29e',
    fontSize: 11.5,
    marginRight: 8,
  },
  rankArrow: {
    color: '#57534e',
    fontSize: 12,
  }
});
