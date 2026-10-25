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
import { apiFetch, getStoredProfile } from '../api/client';
import { MenuItem, MENU_DATA } from '../constants/menuData';

const { width } = Dimensions.get('window');

import { MenuProperty, AKINATOR_PROPERTIES } from '../constants/akinatorQuestions';
import {
  Answer,
  MAX_QUESTIONS,
  RecentMeal,
  applyAnswer,
  buildInitialPool,
  parseAvoidTags,
  pickNextQuestion,
  rankResults,
  shouldStop
} from '../engine/filterEngine';

interface Restaurant {
  name: string;
  rating: string;
  distance: string;
  category: string;
  url: string;
  address: string;
  type: string;
}

const getOfflineFallbackRestaurants = (menuName: string): Restaurant[] => {
  return [
    { name: `가마솥 전통 ${menuName} 마포본점`, rating: '⭐ 4.8', distance: '150m', category: '음식점', url: `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(menuName)}`, address: '서울시 마포구 역삼로', type: '오프라인 추천' },
    { name: `소문난 3대 맛집 ${menuName}`, rating: '⭐ 4.6', distance: '380m', category: '전문 식당', url: `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(menuName)}`, address: '서울시 강남구 테헤란로', type: '인기 매장' },
  ];
};

interface RecommendScreenProps {
  navigation: any;
  isLoggedIn: boolean;
  userProfile: any;
}

export default function RecommendScreen({ navigation, isLoggedIn, userProfile }: RecommendScreenProps) {
  // 게임 단계: 'intro' (사전 제외 장르 선택) | 'questioning' (아키네이터 구동) | 'reveal' (결과 목록)
  const [gameState, setGameState] = useState<'intro' | 'questioning' | 'reveal'>('intro');
  
  // 오늘 먹기 싫어 선택 제외할 음식 카테고리 상태 (다중선택)
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  
  // 아키네이터 연동 핵심 상태값들
  const [pool, setPool] = useState<MenuItem[]>(MENU_DATA);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<MenuProperty | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(0);

  const [matchingResults, setMatchingResults] = useState<MenuItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);

  // GPS 위치 및 백엔드 통신용 상태값
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

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
          console.log('🛰️ GPS Locked successfully on startup:', location.coords.latitude, location.coords.longitude);
        }
      } catch (error) {
        console.log('⚠️ Error getting initial GPS location:', error);
      }
    })();
  }, []);

  // 아키네이터 인트로 셋업 및 초기화
  const resetGame = () => {
    setExcludedCategories([]);
    setPool(MENU_DATA);
    setAskedQuestionIds([]);
    setCurrentQuestion(null);
    setQuestionCount(0);
    setMatchingResults([]);
    setSelectedMenu(null);
    setRestaurantsList([]);
    setGameState('intro');
    refreshLocation();
  };

  const refreshLocation = async () => {
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
      }
    } catch (e) {
      console.log('GPS Refresh Failed');
    }
  };

  // 먹기 싫은 카테고리 토글 함수
  const handleToggleExcludeCategory = (category: string) => {
    if (excludedCategories.includes(category)) {
      setExcludedCategories(excludedCategories.filter(c => c !== category));
    } else {
      setExcludedCategories([...excludedCategories, category]);
    }
  };

  // 아키네이터 게임 기동
  const startAkinator = async () => {
    // 사전 제외 장르 + 마이페이지에서 설정한 기피 성분(avoidTags) 차단
    let avoidTags: string[] = [];
    try {
      const profile = await getStoredProfile();
      avoidTags = parseAvoidTags(profile?.avoidTags);
      if (avoidTags.length > 0) console.log("🚫 Akinator Pre-filtering avoid tags:", avoidTags);
    } catch (e) {
      console.log("Failed to load user avoid tags on setup", e);
    }
    const initialPool = buildInitialPool(MENU_DATA, excludedCategories, avoidTags);

    if (initialPool.length === 0) {
      Alert.alert("경고 ⚠️", "모든 메뉴 카테고리를 제외하셨습니다. 최소 한 개 이상의 종류를 남겨두세요.");
      return;
    }

    setPool(initialPool);
    setAskedQuestionIds([]);
    setQuestionCount(0);
    setGameState('questioning');
    
    // 첫 질문 선택 구동
    determineNextQuestion(initialPool, []);
  };

  // 예/아니오가 가장 반반으로 나뉘는 다음 질문 선정
  const determineNextQuestion = (currentPool: MenuItem[], askedIds: string[]) => {
    const nextQuestion = pickNextQuestion(currentPool, AKINATOR_PROPERTIES, askedIds);
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setQuestionCount(prev => prev + 1);
    } else {
      finishAkinator(currentPool);
    }
  };

  // 아키네이터 답변 접수 및 동적 연산 처리
  const handleAnswer = (answerType: Answer) => {
    if (!currentQuestion) return;

    const newPool = applyAnswer(pool, currentQuestion, answerType);
    const nextAskedIds = [...askedQuestionIds, currentQuestion.id];
    setAskedQuestionIds(nextAskedIds);
    setPool(newPool);

    if (shouldStop(newPool, questionCount)) {
      finishAkinator(newPool);
    } else {
      determineNextQuestion(newPool, nextAskedIds);
    }
  };

  // 최종 채점 및 랭킹 정렬 및 겹침 회피 적용
  const finishAkinator = async (finalPool: MenuItem[]) => {
    setGameState('reveal');
    const rankedPool = finalPool.length > 0 ? finalPool : (pool.length > 0 ? pool : MENU_DATA);

    // 최근 식사 히스토리로 겹침 방지 감점
    let recentMeals: RecentMeal[] = [];
    if (isLoggedIn) {
      try {
        const res = await apiFetch(`/api/user/histories`);
        if (res.ok) {
          const data = await res.json();
          recentMeals = data.histories || [];
        }
      } catch (e) {
        console.log("Failed to fetch history for Akinator scoring calculation", e);
      }
    }

    const sorted = rankResults(rankedPool, recentMeals);
    setMatchingResults(sorted);
    
    if (sorted.length > 0) {
      onSelectMenu(sorted[0]); // 첫 번째 1위 점수 획득 메뉴 자동 로드
    }
  };

  const onSelectMenu = async (menu: MenuItem) => {
    setSelectedMenu(menu);
    setLoadingRestaurants(true);
    setRestaurantsList([]);

    try {
      const lat = userCoords?.latitude || '37.497942';
      const lng = userCoords?.longitude || '127.0276197';
      const url = `/api/restaurants?keyword=${encodeURIComponent(menu.name)}&x=${lng}&y=${lat}`;

      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        setRestaurantsList(data.restaurants || []);
      } else {
        setRestaurantsList(getOfflineFallbackRestaurants(menu.name));
      }
    } catch (error) {
      setRestaurantsList(getOfflineFallbackRestaurants(menu.name));
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const handleOpenMap = async (res: Restaurant) => {
    if (!selectedMenu) return;

    if (isLoggedIn) {
      try {
        console.log(`📅 Logging history: Eaten ${selectedMenu.name} at ${res.name}`);
        await apiFetch(`/api/user/histories`, {
          method: 'POST',
          body: {
            menuName: selectedMenu.name,
            emoji: selectedMenu.emoji,
            restaurantName: res.name,
            category: selectedMenu.category
          }
        });
      } catch (e) {
        console.log("Failed to sync eaten history to backend database", e);
      }
    }

    console.log("📡 Navigating to in-app map screen with restaurant param:", res.name);
    navigation.navigate("지도", { restaurant: res });
  };

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

  const handleToggleFavorite = async () => {
    if (!selectedMenu) return;

    if (!isLoggedIn) {
      Alert.alert(
        "로그인이 필요한 서비스입니다 🐣",
        "최애 음식을 등록하고 나만의 맛집 리스트를 간직하려면 카카오로 로그인해 보세요!",
        [
          { text: "나중에" },
          { text: "로그인하러 가기 ➔", onPress: () => navigation.navigate("마이페이지") }
        ]
      );
      return;
    }

    try {
      console.log(`❤️ Toggling favorite for: ${selectedMenu.name}`);
      const res = await apiFetch(`/api/user/favorites`, {
        method: 'POST',
        body: {
          menuName: selectedMenu.name,
          emoji: selectedMenu.emoji,
          category: selectedMenu.category
        }
      });
      if (res.ok) {
        Alert.alert("등록 성공 🐣", `[${selectedMenu.name}]이 최애 음식 리스트에 영구 보관되었습니다! 내 정보 탭에서 확인해 보세요.`);
      }
    } catch (e) {
      Alert.alert("에러", "최애 메뉴 저장에 실패했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* 1. 인트로 단계 (기피 장르 사전 조율) */}
      {gameState === 'intro' && (
        <View style={styles.introContainer}>
          <View style={styles.introHeader}>
            <Text style={styles.introEmoji}>🕵️‍♂️</Text>
            <Text style={styles.introTitle}>메추리 아키네이터</Text>
            <Text style={styles.introSubtitle}>
              오늘 피하고 싶은 음식 장르가 있다면 미리 체크해 주세요.{'\n'}
              선택한 카테고리는 추천 풀에서 제외하고 퀴즈를 시작합니다!
            </Text>
          </View>

          {/* 장르 선택 영역 */}
          <View style={styles.genreList}>
            {['한식', '중식', '일식', '양식'].map((genre, idx) => {
              const isExcluded = excludedCategories.includes(genre);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.genreButton,
                    isExcluded && styles.genreButtonExcluded
                  ]}
                  onPress={() => handleToggleExcludeCategory(genre)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.genreEmoji}>
                    {genre === '한식' ? '🇰🇷' : genre === '중식' ? '🇨🇳' : genre === '일식' ? '🇯🇵' : '🍕'}
                  </Text>
                  <Text style={[
                    styles.genreLabel,
                    isExcluded && styles.genreLabelExcluded
                  ]}>
                    {genre}
                  </Text>
                  <Text style={[
                    styles.genreStatusText,
                    isExcluded && styles.genreStatusTextExcluded
                  ]}>
                    {isExcluded ? '제외됨 ✕' : '포함됨 ✓'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startAkinator}>
            <Text style={styles.startButtonText}>추리 퀴즈 시작하기 ➔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. 아키네이터 질문 구동 단계 */}
      {gameState === 'questioning' && currentQuestion && (
        <View style={styles.quizContainer}>
          {/* Header Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>질문 {questionCount} / {MAX_QUESTIONS}</Text>
              <Text style={styles.poolCountText}>남은 메뉴 후보: {pool.length}개</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${(questionCount / MAX_QUESTIONS) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Question Text */}
          <View style={styles.questionCard}>
            <Text style={styles.questionIcon}>🐣</Text>
            <Text style={styles.questionText}>{currentQuestion.text}</Text>
          </View>

          {/* Akinator 3지선다 버튼 */}
          <View style={styles.akinatorButtons}>
            <TouchableOpacity 
              style={[styles.btnAnswer, styles.btnYes]}
              onPress={() => handleAnswer('yes')}
            >
              <Text style={styles.btnAnswerText}>👍 예 (좋아요)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnAnswer, styles.btnNo]}
              onPress={() => handleAnswer('no')}
            >
              <Text style={styles.btnAnswerText}>👎 아니오 (싫어요)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnAnswer, styles.btnDontKnow]}
              onPress={() => handleAnswer('dontknow')}
            >
              <Text style={styles.btnAnswerText}>🤷 상관없음 (잘 모름)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.resetButtonText}>처음으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. 추천 결과 단계 */}
      {gameState === 'reveal' && (
        <ScrollView style={styles.scrollReveal} contentContainerStyle={styles.revealContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.revealTitle}>🕵️‍♂️ 메추리 요정의 추리 결과!</Text>
          <Text style={styles.revealSubtitle}>아키네이터 답변과 최근 식습관 감점을 고려한 최적의 식사 정렬 목록입니다.</Text>

          {/* 추천 메뉴 가로 스크롤 카드 리스트 */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.menuHorizontalList}
          >
            {matchingResults.map((item, idx) => {
              const isSelected = selectedMenu?.name === item.name;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.menuTile,
                    isSelected && styles.menuTileSelected
                  ]}
                  onPress={() => onSelectMenu(item)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.menuTileEmoji}>{item.emoji}</Text>
                  <Text style={styles.menuTileName}>{item.name}</Text>
                  <Text style={styles.menuTileCategory}>{item.category}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 선택된 음식 상세 설명 패널 */}
          {selectedMenu && (
            <View style={styles.selectedDetailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{selectedMenu.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.detailTitle}>{selectedMenu.name}</Text>
                    <TouchableOpacity onPress={handleToggleFavorite} style={styles.heartBtn}>
                      <Text style={{ fontSize: 20 }}>❤️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.detailCategory}>{selectedMenu.category}</Text>
                </View>
              </View>
              <Text style={styles.detailDesc}>{selectedMenu.desc}</Text>
              
              <TouchableOpacity 
                style={styles.baeminSearchBtn}
                onPress={() => handleOpenBaemin(selectedMenu.name)}
              >
                <Text style={styles.baeminSearchText}>🛵 배달의민족에서 바로 주문하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 동적 실서버 주변 맛집 출력부 */}
          {selectedMenu && (
            <View style={styles.restaurantsSection}>
              <Text style={styles.restaurantSectionTitle}>
                📍 내 GPS 주변 실제 {selectedMenu.name} 식당 목록
              </Text>
              
              {loadingRestaurants ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fbbf24" />
                  <Text style={styles.loadingText}>메추리가 열심히 맛집을 수집하는 중...</Text>
                </View>
              ) : (
                restaurantsList.length > 0 ? (
                  restaurantsList.map((res, idx) => (
                    <View key={idx} style={styles.restaurantCard}>
                      <View style={styles.resInfoRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={styles.resBadgeRow}>
                            <Text style={styles.resName} numberOfLines={1}>{res.name}</Text>
                            <Text style={styles.resBadge}>{res.type}</Text>
                          </View>
                          <Text style={styles.resMeta} numberOfLines={1}>{res.rating} • {res.distance} • {res.category}</Text>
                          <Text style={styles.resAddress} numberOfLines={1}>{res.address}</Text>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.navButton}
                          onPress={() => handleOpenMap(res)}
                        >
                          <Text style={styles.navButtonText}>지도보기 ➔</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>근처 1.5km 이내에 가게를 찾지 못했습니다.</Text>
                  </View>
                )
              )}
            </View>
          )}

          <TouchableOpacity style={styles.retryButton} onPress={resetGame}>
            <Text style={styles.retryButtonText}>다시 추리 풀기 🔄</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1917', // Warm Dark Stone
  },
  introContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-around',
  },
  introHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  introEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fbbf24',
    marginBottom: 10,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 20,
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  genreButton: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  genreButtonExcluded: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  genreEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  genreLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  genreLabelExcluded: {
    color: '#ef4444',
  },
  genreStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
  },
  genreStatusTextExcluded: {
    color: '#ef4444',
  },
  startButton: {
    backgroundColor: '#fbbf24',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#1c1917',
    fontSize: 15,
    fontWeight: '800',
  },

  // Akinator questioning styles
  quizContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    color: '#a8a29e',
    fontSize: 13,
    fontWeight: '600',
  },
  poolCountText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.8)',
    borderRadius: 22,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    marginVertical: 14,
    alignItems: 'center',
  },
  questionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  questionText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  akinatorButtons: {
    width: '100%',
    marginBottom: 20,
  },
  btnAnswer: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
  },
  btnAnswerText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  btnYes: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: '#fbbf24',
    color: '#fbbf24',
  },
  btnNo: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  btnDontKnow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resetButton: {
    paddingVertical: 6,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#78716c',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Reveal screen styles
  scrollReveal: {
    flex: 1,
  },
  revealContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  revealTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fbbf24',
    marginBottom: 6,
  },
  revealSubtitle: {
    fontSize: 12,
    color: '#a8a29e',
    marginBottom: 20,
  },
  menuHorizontalList: {
    paddingRight: 20,
    marginBottom: 24,
    height: 130,
  },
  menuTile: {
    width: 110,
    height: 120,
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
  },
  menuTileSelected: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: '#fbbf24',
    borderWidth: 2,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  menuTileEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  menuTileName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  menuTileCategory: {
    color: '#78716c',
    fontSize: 10,
  },
  selectedDetailCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.8)',
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailEmoji: {
    fontSize: 48,
    marginRight: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  heartBtn: {
    padding: 4,
  },
  detailCategory: {
    color: '#a8a29e',
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 2,
  },
  detailDesc: {
    color: '#d6d3d1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  baeminSearchBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  baeminSearchText: {
    color: '#1c1917',
    fontSize: 13,
    fontWeight: '800',
  },
  restaurantsSection: {
    marginBottom: 24,
  },
  restaurantSectionTitle: {
    color: '#f8fafc',
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: '#a8a29e',
    fontSize: 11,
    marginTop: 8,
  },
  restaurantCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  resInfoRow: {
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
    fontSize: 13.5,
    fontWeight: '800',
    maxWidth: '70%',
  },
  resBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    color: '#fbbf24',
    fontSize: 8.5,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  resMeta: {
    color: '#a8a29e',
    fontSize: 10.5,
    marginBottom: 2,
  },
  resAddress: {
    color: '#57534e',
    fontSize: 10.5,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonText: {
    color: '#d6d3d1',
    fontSize: 10.5,
    fontWeight: '800',
  },
  emptyContainer: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#78716c',
    fontSize: 11.5,
  },
  retryButton: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  retryButtonText: {
    color: '#a8a29e',
    fontSize: 13,
    fontWeight: '800',
  }
});
