import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../api/client';
import { addHistory, isFavorite, toggleFavorite } from '../storage/userData';
import { MenuItem, MENU_DATA } from '../constants/menuData';

const { width } = Dimensions.get('window');

interface Restaurant {
  name: string;
  distance: string;
  category: string;
  url: string;
  address: string;
  type?: string;
}

// 위치를 못 받았을 때 쓰는 기본 위치 (강남역). 화면에도 그렇게 표시한다
const DEFAULT_COORDS = { latitude: 37.497942, longitude: 127.0276197 };

interface WorldCupScreenProps {
  navigation: any;
  isLoggedIn: boolean;
  userProfile: any;
}

export default function WorldCupScreen({ navigation, isLoggedIn, userProfile }: WorldCupScreenProps) {
  // 게임 단계: 'intro' (강수 선택) | 'playing' (진행 중) | 'winner' (우승 결정)
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'winner'>('intro');
  
  // 라운드 설정: 8 (8강) | 16 (16강)
  const [totalRounds, setTotalRounds] = useState<8 | 16>(16);
  
  // 토너먼트 상태 관리
  const [currentCandidates, setCurrentCandidates] = useState<MenuItem[]>([]);
  const [nextRoundCandidates, setNextRoundCandidates] = useState<MenuItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [roundName, setRoundName] = useState<string>('16강');
  
  // 우승자 관리
  const [winnerMenu, setWinnerMenu] = useState<MenuItem | null>(null);
  // null = 아직 모름 (하트 비활성)
  const [winnerFavorited, setWinnerFavorited] = useState<boolean | null>(null);
  
  // GPS 및 주변 맛집용 상태
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [restaurantsError, setRestaurantsError] = useState(false);

  // 컴포넌트 마운트 시 위치 권한 요청 및 좌표 획득
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          setUserCoords({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          console.log('🛰️ WorldCup GPS Locked:', location.coords.latitude, location.coords.longitude);
        }
      } catch (error) {
        console.log('⚠️ Error getting WorldCup GPS location:', error);
      }
    })();
  }, []);

  // 게임 시작 설정
  const startWorldCup = (rounds: 8 | 16) => {
    setTotalRounds(rounds);
    
    // 전체 메뉴 데이터에서 랜덤 셔플 후 필요한 개수만큼 추출
    const shuffled = [...MENU_DATA].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, rounds);
    
    setCurrentCandidates(selected);
    setNextRoundCandidates([]);
    setCurrentIndex(0);
    setRoundName(`${rounds}강`);
    setWinnerMenu(null);
    setRestaurantsList([]);
    setGameState('playing');
  };

  // 음식 카드 선택 시 처리
  const selectMenu = (selected: MenuItem) => {
    const nextList = [...nextRoundCandidates, selected];
    setNextRoundCandidates(nextList);

    // 현재 라운드 매치 완료 여부 검사
    if (currentIndex + 2 >= currentCandidates.length) {
      // 다음 라운드 진출자가 1명이면 우승!
      if (nextList.length === 1) {
        finishWorldCup(selected);
      } else {
        // 다음 라운드 세팅
        setCurrentCandidates(nextList);
        setNextRoundCandidates([]);
        setCurrentIndex(0);
        
        // 라운드 이름 업데이트
        const nextRoundSize = nextList.length;
        if (nextRoundSize === 8) setRoundName('8강');
        else if (nextRoundSize === 4) setRoundName('준결승 (4강)');
        else if (nextRoundSize === 2) setRoundName('결승전');
        else setRoundName(`${nextRoundSize}강`);
      }
    } else {
      // 다음 대결 매치로 인덱스 이동
      setCurrentIndex(currentIndex + 2);
    }
  };

  // 주변 식당 검색. 실패하면 지어낸 식당 대신 오류와 다시 시도 버튼을 보여 준다
  const loadRestaurants = async (menuName: string) => {
    setLoadingRestaurants(true);
    setRestaurantsError(false);
    setRestaurantsList([]);
    try {
      const { latitude, longitude } = userCoords ?? DEFAULT_COORDS;
      const url = `/api/restaurants?keyword=${encodeURIComponent(menuName)}&x=${longitude}&y=${latitude}`;
      const response = await apiFetch(url, { timeoutMs: 8000 });
      if (!response.ok) throw new Error(`restaurants ${response.status}`);
      const data = await response.json();
      setRestaurantsList(data.restaurants || []);
    } catch (error) {
      console.log("Failed to load restaurants for WorldCup winner", error);
      setRestaurantsError(true);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // 최종 우승 처리 및 맛집 API 동기화
  const finishWorldCup = async (winner: MenuItem) => {
    setWinnerMenu(winner);
    setWinnerFavorited(null);
    setGameState('winner');

    // 하트는 식당 검색을 기다리지 않고 바로 실제 최애 상태를 읽는다. 그 사이 사용자가 누른 값은 덮어쓰지 않는다
    isFavorite(winner.name)
      .then(favorited => setWinnerFavorited(prev => (prev === null ? favorited : prev)))
      .catch(e => {
        console.log("Failed to load WorldCup winner favorite state", e);
        setWinnerFavorited(prev => (prev === null ? false : prev));
      });

    // 1. 주변 식당 목록 API 호출
    await loadRestaurants(winner.name);

    // 2. 우승 메뉴를 식사 기록에 저장 (게스트는 이 기기에, 로그인은 서버에)
    try {
      console.log(`🏆 Logging WorldCup winner: ${winner.name}`);
      await addHistory({
        menuName: winner.name,
        emoji: winner.emoji,
        restaurantName: '이상형 월드컵 우승',
        category: winner.category
      });
    } catch (e) {
      console.log("Failed to save WorldCup winner history", e);
    }
  };

  // 인앱 지도 이동 처리
  const handleOpenMap = (res: Restaurant) => {
    console.log("📡 Navigating to in-app map screen from WorldCup:", res.name);
    navigation.navigate("지도", { restaurant: res });
  };

  // 배달의민족 연결
  const handleOpenBaemin = (menuName: string) => {
    const query = encodeURIComponent(menuName);
    const appUrl = `baemin://search?keyword=${query}`;
    const webUrl = `https://m.baemin.com`;
    
    Linking.canOpenURL(appUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(appUrl);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  };

  // 최애 등록/해제. 게스트도 이 기기에 저장되고, 3개째면 저장소가 로그인 시트를 띄운다
  const handleToggleFavorite = async () => {
    if (!winnerMenu || winnerFavorited === null) return;

    try {
      const { favorited } = await toggleFavorite({
        menuName: winnerMenu.name,
        emoji: winnerMenu.emoji,
        category: winnerMenu.category
      });
      setWinnerFavorited(favorited);
    } catch (e) {
      Alert.alert("에러", "최애 메뉴 저장에 실패했습니다.");
    }
  };

  // 현재 매치의 두 메뉴 정보 가져오기
  const leftMenu = currentCandidates[currentIndex];
  const rightMenu = currentCandidates[currentIndex + 1];

  // 1. 인트로 화면
  if (gameState === 'intro') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.introHeader}>
            <Text style={styles.introEmoji}>🏆</Text>
            <Text style={styles.introTitle}>음식 이상형 월드컵</Text>
            <Text style={styles.introSubtitle}>
              메추리가 엄선한 맛있는 음식들의 대결!{'\n'}
              고민되는 오늘의 메뉴를 월드컵 토너먼트로 골라보세요.
            </Text>
          </View>
          
          <View style={styles.introOptionContainer}>
            <TouchableOpacity 
              style={[styles.introButton, { borderColor: '#fbbf24' }]} 
              onPress={() => startWorldCup(16)}
            >
              <Text style={styles.introButtonEmoji}>🔥</Text>
              <Text style={styles.introButtonTitle}>16강전 시작하기</Text>
              <Text style={styles.introButtonSub}>대중적이고 다채로운 16개 메뉴 매치</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.introButton, { borderColor: 'rgba(255,255,255,0.1)' }]} 
              onPress={() => startWorldCup(8)}
            >
              <Text style={styles.introButtonEmoji}>⚡</Text>
              <Text style={styles.introButtonTitle}>8강전 시작하기</Text>
              <Text style={styles.introButtonSub}>빠르고 굵게 고르는 8개 메뉴 매치</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. 월드컵 대결 화면
  if (gameState === 'playing' && leftMenu && rightMenu) {
    const totalMatchesInRound = currentCandidates.length / 2;
    const currentMatchNumber = currentIndex / 2 + 1;
    
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.gameHeader}>
          <Text style={styles.roundTitle}>🏆 {roundName}</Text>
          <Text style={styles.matchProgress}>
            매치 {currentMatchNumber} / {totalMatchesInRound}
          </Text>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${(currentMatchNumber / totalMatchesInRound) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.cardsContainer}>
          {/* 왼쪽 카드 */}
          <TouchableOpacity 
            style={styles.foodCard} 
            activeOpacity={0.85} 
            onPress={() => selectMenu(leftMenu)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardCategory}>{leftMenu.category}</Text>
            </View>
            <Text style={styles.cardEmoji}>{leftMenu.emoji}</Text>
            <Text style={styles.cardName}>{leftMenu.name}</Text>
            <Text style={styles.cardDesc}>{leftMenu.desc}</Text>
            <View style={styles.selectBadge}>
              <Text style={styles.selectBadgeText}>선택 ➔</Text>
            </View>
          </TouchableOpacity>

          {/* VS 구분선 */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* 오른쪽 카드 */}
          <TouchableOpacity 
            style={styles.foodCard} 
            activeOpacity={0.85} 
            onPress={() => selectMenu(rightMenu)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardCategory}>{rightMenu.category}</Text>
            </View>
            <Text style={styles.cardEmoji}>{rightMenu.emoji}</Text>
            <Text style={styles.cardName}>{rightMenu.name}</Text>
            <Text style={styles.cardDesc}>{rightMenu.desc}</Text>
            <View style={styles.selectBadge}>
              <Text style={styles.selectBadgeText}>선택 ➔</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.abandonButton} onPress={() => setGameState('intro')}>
          <Text style={styles.abandonText}>월드컵 포기하고 나가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 3. 우승 결과 화면
  if (gameState === 'winner' && winnerMenu) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.winnerWrapper} showsVerticalScrollIndicator={false}>
          
          {/* 우승 헤더 */}
          <View style={styles.winnerHeader}>
            <Text style={styles.winnerSubtitle}>🏆 내 마음의 우승 메뉴!</Text>
            <Text style={styles.winnerMainTitle}>오늘의 추천 음식 결정</Text>
          </View>

          {/* 우승 음식 카드 */}
          <View style={styles.winnerCard}>
            <View style={styles.winnerCardInfo}>
              <Text style={styles.winnerEmoji}>{winnerMenu.emoji}</Text>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={styles.winnerTitleRow}>
                  <Text style={styles.winnerMenuName}>{winnerMenu.name}</Text>
                  <TouchableOpacity onPress={handleToggleFavorite} style={styles.favBtn} disabled={winnerFavorited === null}>
                    <Text style={{ fontSize: 22 }}>{winnerFavorited ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.winnerCategory}>{winnerMenu.category}</Text>
              </View>
            </View>
            <Text style={styles.winnerDesc}>{winnerMenu.desc}</Text>

            <TouchableOpacity 
              style={styles.baeminBtn} 
              onPress={() => handleOpenBaemin(winnerMenu.name)}
            >
              <Text style={styles.baeminBtnText}>🛵 배달의민족에서 바로 주문하기</Text>
            </TouchableOpacity>
          </View>

          {/* 주변 식당 매칭 */}
          <View style={styles.restaurantsSection}>
            <Text style={styles.restaurantsTitle}>
              📍 {userCoords ? '내 주변' : '강남역 근처 (위치 권한 없음)'} {winnerMenu.name} 식당
            </Text>

            {loadingRestaurants ? (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color="#fbbf24" />
                <Text style={styles.loadingText}>메추리가 실제 식당 정보를 검색하는 중...</Text>
              </View>
            ) : restaurantsError ? (
              <View style={styles.emptyWrapper}>
                <Text style={styles.emptyText}>식당 정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</Text>
                <TouchableOpacity style={styles.reloadBtn} onPress={() => loadRestaurants(winnerMenu.name)}>
                  <Text style={styles.reloadBtnText}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            ) : (
              restaurantsList.length > 0 ? (
                restaurantsList.map((res, idx) => (
                  <View key={idx} style={styles.restaurantCard}>
                    <View style={styles.resRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={styles.resBadgeRow}>
                          <Text style={styles.resName} numberOfLines={1}>{res.name}</Text>
                          {!!res.type && <Text style={styles.resTypeBadge}>{res.type}</Text>}
                        </View>
                        <Text style={styles.resMeta} numberOfLines={1}>
                          {[res.distance, res.category].filter(Boolean).join(' • ')}
                        </Text>
                        <Text style={styles.resAddress} numberOfLines={1}>{res.address}</Text>
                      </View>

                      <TouchableOpacity 
                        style={styles.navBtn} 
                        onPress={() => handleOpenMap(res)}
                      >
                        <Text style={styles.navBtnText}>지도보기 ➔</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyWrapper}>
                  <Text style={styles.emptyText}>반경 1.5km 이내에 해당 요리 전문점을 찾지 못했습니다.</Text>
                </View>
              )
            )}
          </View>

          {/* 하단 다시 하기 버튼 */}
          <TouchableOpacity style={styles.retryBtn} onPress={() => setGameState('intro')}>
            <Text style={styles.retryBtnText}>새로운 월드컵 시작하기 🔄</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 폴백 로딩
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1917', // Warm Dark Stone
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-around',
  },
  introHeader: {
    alignItems: 'center',
    marginTop: 40,
  },
  introEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fbbf24', // Gold
    marginBottom: 12,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 22,
  },
  introOptionContainer: {
    width: '100%',
    paddingBottom: 40,
  },
  introButton: {
    backgroundColor: 'rgba(41, 37, 36, 0.8)',
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introButtonEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  introButtonTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  introButtonSub: {
    color: '#78716c',
    fontSize: 11,
  },

  // playing
  gameHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  roundTitle: {
    color: '#fbbf24',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  matchProgress: {
    color: '#a8a29e',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  cardsContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 16,
  },
  foodCard: {
    flex: 0.46,
    backgroundColor: 'rgba(41, 37, 36, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.1)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  cardCategory: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#a8a29e',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardEmoji: {
    fontSize: 50,
    marginVertical: 8,
  },
  cardName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardDesc: {
    color: '#78716c',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  selectBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: '#fbbf24',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  selectBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
  },
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    zIndex: 10,
  },
  vsText: {
    color: '#78716c',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    backgroundColor: '#1c1917',
    paddingHorizontal: 16,
  },
  abandonButton: {
    alignSelf: 'center',
    marginBottom: 20,
    paddingVertical: 6,
  },
  abandonText: {
    color: '#57534e',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // winner screen
  scrollContainer: {
    flex: 1,
  },
  winnerWrapper: {
    padding: 20,
    paddingBottom: 40,
  },
  winnerHeader: {
    alignItems: 'center',
    marginVertical: 14,
  },
  winnerSubtitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  winnerMainTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  winnerCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    padding: 20,
    marginBottom: 24,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  winnerCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  winnerEmoji: {
    fontSize: 48,
  },
  winnerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  winnerMenuName: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  favBtn: {
    padding: 4,
  },
  winnerCategory: {
    color: '#a8a29e',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  winnerDesc: {
    color: '#d6d3d1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  baeminBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baeminBtnText: {
    color: '#1c1917',
    fontSize: 14,
    fontWeight: '900',
  },

  // restaurants
  restaurantsSection: {
    marginBottom: 20,
  },
  restaurantsTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  loadingWrapper: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    color: '#a8a29e',
    fontSize: 12,
    marginTop: 10,
  },
  restaurantCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    maxWidth: '70%',
  },
  resTypeBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  resMeta: {
    color: '#a8a29e',
    fontSize: 11,
    marginBottom: 2,
  },
  resAddress: {
    color: '#57534e',
    fontSize: 11,
  },
  navBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navBtnText: {
    color: '#d6d3d1',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyWrapper: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  reloadBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  reloadBtnText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#78716c',
    fontSize: 12,
  },
  retryBtn: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  retryBtnText: {
    color: '#a8a29e',
    fontSize: 13,
    fontWeight: '800',
  },
});
