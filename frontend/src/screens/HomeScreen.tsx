import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { apiFetch } from '../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { styles } from './HomeScreen.style';
import QuailBadge from '../components/QuailBadge';

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

  // 홈은 회색 바탕에 흰 카드: 추천 받기 카드 → 다른 방법 목록 → 요즘 많이 고른 메뉴
  const shortcuts: { label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }[] = [
    { label: '메뉴 월드컵', desc: '둘 중 하나씩 골라요', icon: 'trophy-outline', onPress: () => navigation.navigate('월드컵') },
    { label: '같이 정하기', desc: '친구들과 같은 질문에 답해요', icon: 'people-outline', onPress: () => navigation.navigate('같이') },
    { label: '주변 식당', desc: '지도에서 바로 찾아요', icon: 'location-outline', onPress: () => navigation.navigate('지도') },
  ];

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>메추리</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('마이페이지')}
            accessibilityLabel="내 정보"
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.subtle} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.greetingRow}>
            <QuailBadge size={44} />
            <Text style={styles.greetingText}>
              {nickname ? `${nickname}, ` : ''}{getGreeting()}
            </Text>
          </View>
          <Text style={styles.heroTitle}>메뉴 고민,{'\n'}질문 몇 개로 끝내요</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={startRecommend}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>바로 추천 받기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {shortcuts.map((item) => (
            <TouchableOpacity key={item.label} style={styles.listRow} onPress={item.onPress} activeOpacity={0.7}>
              <View style={styles.listIcon}>
                <Ionicons name={item.icon} size={22} color={colors.subtle} />
              </View>
              <View style={styles.listTextWrap}>
                <Text style={styles.listTitle}>{item.label}</Text>
                <Text style={styles.listDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rankingCard}>
          <View style={styles.rankingHeaderRow}>
            <Text style={styles.sectionTitleInline}>요즘 많이 고른 메뉴</Text>
            <TouchableOpacity onPress={fetchRanking} disabled={loadingRanking} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>새로고침</Text>
            </TouchableOpacity>
          </View>
          {loadingRanking ? (
            <View style={styles.rankingLoading}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={styles.rankingLoadingText}>랭킹을 불러오는 중이에요</Text>
            </View>
          ) : rankingList.length === 0 ? (
            <Text style={styles.rankingEmptyText}>
              {rankingFailed ? '랭킹을 불러오지 못했어요. 잠시 후 새로고침해 주세요.' : '아직 데이터가 없어요. 첫 기록을 남겨 보세요!'}
            </Text>
          ) : (
            rankingList.map((item) => (
              <View key={`${item.rank}-${item.menuName}`} style={styles.rankingRow}>
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
