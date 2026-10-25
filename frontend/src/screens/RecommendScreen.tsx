import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Animated
} from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../api/client';
import { addHistory, getAvoidTags, getFavorites, getHistories, isFavorite, toggleFavorite } from '../storage/userData';
import { MenuItem, MENU_DATA, CUISINES, Cuisine } from '../constants/menuData';
import MiniWorldCup from '../components/MiniWorldCup';
import { openDelivery } from '../utils/openDelivery';
import { AcceptAction, newSessionId, track } from '../analytics/events';

const { width } = Dimensions.get('window');

const CUISINE_EMOJI: Record<Cuisine, string> = { 한식: '🇰🇷', 중식: '🇨🇳', 일식: '🇯🇵', 양식: '🍕', 분식: '🍢', 아시안: '🍜' };

import { Question, QUESTIONS } from '../constants/akinatorQuestions';
import { createScoreSession } from '../engine/scoreEngine';
import {
  RecommendResult,
  RecommendSession,
  answerQuestion,
  canReject,
  getResults,
  rejectTopResult,
  pickNextQuestion,
  shouldStop,
  toRecommendSession
} from '../engine/recommendFlow';
import { RETRY_WORLDCUP_SIZE, SHOW_SKIP_FROM_QUESTION, ScoreAnswer } from '../engine/config';
import { personalAdjustments } from '../engine/personalize';


const ANSWER_BUTTONS: { answer: ScoreAnswer; label: string }[] = [
  { answer: 'yes', label: '👍 예' },
  { answer: 'probably', label: '🙂 아마도' },
  { answer: 'dontcare', label: '🤷 상관없음' },
  { answer: 'no', label: '👎 아니오' }
];

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
  route?: { params?: { autoStart?: number } };
  isLoggedIn: boolean;
  userProfile: any;
}

export default function RecommendScreen({ navigation, route, isLoggedIn, userProfile }: RecommendScreenProps) {
  // 게임 단계: 'intro' (사전 제외 장르 선택) | 'questioning' (아키네이터 구동) | 'reveal' (결과 목록)
  // 'worldcup': "틀렸어요"를 두 번 누르면 남은 상위 4개로 고른다 (US-15)
  const [gameState, setGameState] = useState<'intro' | 'questioning' | 'reveal' | 'worldcup'>('intro');
  
  // 오늘 먹기 싫어 선택 제외할 음식 카테고리 상태 (다중선택)
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  
  // 점수 방식 엔진 상태 (src/engine/recommendFlow.ts)
  const [session, setSession] = useState<RecommendSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // 결과: [0]이 지금 보여주는 메뉴, 나머지가 대안
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  // 결과 계산에 쓴 개인화 보정. "틀렸어요" 뒤 다시 계산할 때도 같은 값을 쓴다
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [worldCupResults, setWorldCupResults] = useState<RecommendResult[]>([]);
  const [eatenMenu, setEatenMenu] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const selectedNameRef = useRef<string | null>(null);
  // 지표용 추천 세션 ID (US-23). 추천 한 판마다 새로 만든다
  const analyticsSessionRef = useRef<string | null>(null);
  const trackAccept = (action: AcceptAction, menu: string) =>
    track(analyticsSessionRef.current, { type: 'accept', payload: { action, menu } });
  const revealAnim = useRef(new Animated.Value(0)).current;

  // 지금 묻는 질문 번호 (1부터)
  const questionNumber = (session?.answers.length ?? 0) + 1;
  const questionLimit = session?.questionLimit ?? 7;
  const isRetry = (session?.rejected.length ?? 0) > 0;

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

  // 홈의 "바로 추천"은 autoStart 값을 바꿔 보낸다. 인트로를 건너뛰고 첫 질문부터 시작한다
  const autoStart = route?.params?.autoStart;
  useEffect(() => {
    if (autoStart) startAkinator([], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // 아키네이터 인트로 셋업 및 초기화
  const resetGame = () => {
    setExcludedCategories([]);
    setSession(null);
    setCurrentQuestion(null);
    setResults([]);
    setSelectedMenu(null);
    setAdjustments({});
    setWorldCupResults([]);
    setEatenMenu(null);
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
  const startAkinator = async (excluded: string[] = excludedCategories, auto = false) => {
    // 사전 제외 장르 + 마이페이지에서 설정한 기피 성분(avoidTags)은 시작 전에 후보에서 뺀다
    let avoidTags: string[] = [];
    try {
      avoidTags = await getAvoidTags();
    } catch (e) {
      console.log("Failed to load user avoid tags on setup", e);
    }
    const first = toRecommendSession(createScoreSession(MENU_DATA, { avoidTags, excludedCategories: excluded }));

    if (first.candidates.length === 0) {
      Alert.alert("경고 ⚠️", "제외한 장르와 기피 재료 때문에 남은 메뉴가 없어요. 조건을 조금 풀어 주세요.");
      return;
    }

    analyticsSessionRef.current = newSessionId();
    track(analyticsSessionRef.current, { type: 'rec_start', payload: { autoStart: auto, excluded } });

    setSession(first);
    setGameState('questioning');
    goNext(first);
  };

  // 다음 질문으로 가거나, 멈출 조건이면 결과로
  const goNext = (next: RecommendSession) => {
    const question = shouldStop(next, QUESTIONS) ? null : pickNextQuestion(next, QUESTIONS);
    if (question) {
      setCurrentQuestion(question);
    } else {
      finishAkinator(next);
    }
  };

  const handleAnswer = (answer: ScoreAnswer) => {
    if (!session || !currentQuestion) return;
    track(analyticsSessionRef.current, {
      type: 'question_answer',
      payload: { questionId: currentQuestion.id, answer, index: session.answers.length }
    });
    const next = answerQuestion(session, currentQuestion, answer);
    setSession(next);
    goNext(next);
  };

  // 결과 계산: 답변 점수 + 최근 먹은 메뉴 감점
  // 즐겨찾기 +1, 최근 먹은 메뉴 -2 (US-21). 게스트는 기기, 로그인은 서버 기록을 저장소가 알아서 읽는다
  const loadAdjustments = async (): Promise<Record<string, number>> => {
    // 하나가 실패해도 나머지 기록으로 보정한다
    const [histories, favorites] = await Promise.allSettled([getHistories(), getFavorites()]);
    if (histories.status === 'rejected') console.log("Failed to load histories for adjustments", histories.reason);
    if (favorites.status === 'rejected') console.log("Failed to load favorites for adjustments", favorites.reason);
    return personalAdjustments({
      histories: histories.status === 'fulfilled' ? histories.value : [],
      favorites: favorites.status === 'fulfilled' ? favorites.value : [],
    });
  };

  const showResults = (ranked: RecommendResult[], finalSession: RecommendSession | null, via?: 'worldcup') => {
    if (ranked[0]) {
      track(analyticsSessionRef.current, {
        type: 'result_shown',
        payload: {
          menu: ranked[0].item.name,
          alternatives: ranked.slice(1).map(r => r.item.name),
          questions: finalSession?.answers.length ?? 0,
          retries: finalSession?.rejected.length ?? 0,
          ...(via ? { via } : {})
        }
      });
    }
    setResults(ranked);
    setEatenMenu(null);
    setGameState('reveal');
    revealAnim.setValue(0);
    Animated.spring(revealAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();

    if (ranked.length > 0) {
      onSelectMenu(ranked[0].item);
    }
  };

  const finishAkinator = async (finalSession: RecommendSession) => {
    setCurrentQuestion(null);
    // "틀렸어요" 뒤에는 처음 불러온 보정값을 그대로 쓴다
    const adj = finalSession.rejected.length > 0 ? adjustments : await loadAdjustments();
    setAdjustments(adj);
    showResults(getResults(finalSession, QUESTIONS, adj), finalSession);
  };

  // "틀렸어요" (US-15): 1위를 빼고 질문을 2~3개 더. 두 번째부터는 남은 상위 4개로 월드컵
  const handleReject = () => {
    const top = results[0];
    if (!session || !top || !canReject(session)) return;
    track(analyticsSessionRef.current, { type: 'reject', payload: { menu: top.item.name, retries: session.rejected.length } });
    const next = rejectTopResult(session, top.item.name);
    setSession(next);
    setSelectedMenu(null);
    setRestaurantsList([]);

    if (session.rejected.length >= 1) {
      const cup = getResults(next, QUESTIONS, adjustments, RETRY_WORLDCUP_SIZE);
      if (cup.length >= 2) {
        setWorldCupResults(cup);
        setGameState('worldcup');
        return;
      }
    }
    setResults([]);
    setGameState('questioning');
    goNext(next);
  };

  const handleWorldCupWinner = (menu: MenuItem) => {
    const winner = worldCupResults.find(r => r.item.name === menu.name);
    if (!winner) return;
    showResults([winner, ...worldCupResults.filter(r => r !== winner)].slice(0, 3), session, 'worldcup');
  };

  // 대안을 누르면 1위 자리로 올린다
  const promoteAlternative = (index: number) => {
    const picked = results[index];
    if (!picked) return;
    setResults([picked, ...results.filter((_, i) => i !== index)]);
    onSelectMenu(picked.item);
  };

  // 메뉴를 빨리 바꾸면 이전 메뉴의 식당 응답이 늦게 올 수 있다. 가장 최근 요청의 결과만 쓴다
  const restaurantRequestRef = useRef(0);

  const onSelectMenu = async (menu: MenuItem) => {
    const requestId = ++restaurantRequestRef.current;
    const isLatest = () => requestId === restaurantRequestRef.current;
    setSelectedMenu(menu);
    setFavorited(false);
    selectedNameRef.current = menu.name;
    isFavorite(menu.name)
      .then(f => { if (selectedNameRef.current === menu.name) setFavorited(f); })
      .catch(() => {});
    setLoadingRestaurants(true);
    setRestaurantsList([]);

    try {
      const lat = userCoords?.latitude || '37.497942';
      const lng = userCoords?.longitude || '127.0276197';
      const url = `/api/restaurants?keyword=${encodeURIComponent(menu.name)}&x=${lng}&y=${lat}`;

      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        if (isLatest()) setRestaurantsList(data.restaurants || []);
      } else if (isLatest()) {
        setRestaurantsList(getOfflineFallbackRestaurants(menu.name));
      }
    } catch (error) {
      if (isLatest()) setRestaurantsList(getOfflineFallbackRestaurants(menu.name));
    } finally {
      if (isLatest()) setLoadingRestaurants(false);
    }
  };

  const handleOpenMap = async (res: Restaurant) => {
    if (!selectedMenu) return;
    trackAccept('restaurant', selectedMenu.name);

    try {
      await addHistory({
        menuName: selectedMenu.name,
        emoji: selectedMenu.emoji,
        restaurantName: res.name,
        category: selectedMenu.category
      });
    } catch (e) {
      console.log("Failed to save eaten history", e);
    }

    console.log("📡 Navigating to in-app map screen with restaurant param:", res.name);
    navigation.navigate("지도", { restaurant: res });
  };

  const handleOpenBaemin = async (menuName: string) => {
    trackAccept('delivery', menuName);
    const opened = await openDelivery(menuName);
    if (opened === 'failed') {
      Alert.alert("배달 앱을 열지 못했어요", "배달의민족 앱이나 브라우저를 확인해 주세요.");
    }
  };

  // "근처 식당" (US-20): 지도 탭에서 이 메뉴로 반경 1.5km 검색
  const handleNearby = (menu: MenuItem) => {
    trackAccept('restaurant', menu.name);
    navigation.navigate("지도", { keyword: menu.name, requestedAt: Date.now() });
  };

  // "이거 먹을래요" (US-20): 먹은 기록으로 남긴다 (게스트는 기기에)
  const handleEatThis = async (menu: MenuItem) => {
    try {
      await addHistory({ menuName: menu.name, emoji: menu.emoji, category: menu.category });
    } catch (e) {
      console.log("Failed to save eaten history", e);
      Alert.alert("기록하지 못했어요", "잠시 후 다시 눌러 주세요.");
      return;
    }
    setEatenMenu(menu.name);
    trackAccept('eat', menu.name);
  };

  // 하트: 게스트도 기기에 저장한다. 로그인 안내는 저장소가 정한 때(3개째)만 뜬다 (US-17)
  const handleToggleFavorite = async () => {
    if (!selectedMenu) return;
    const menuName = selectedMenu.name;
    try {
      const { favorited } = await toggleFavorite({
        menuName,
        emoji: selectedMenu.emoji,
        category: selectedMenu.category
      });
      // 저장하는 사이 다른 메뉴를 골랐으면 그 메뉴 하트를 덮어쓰지 않는다
      if (selectedNameRef.current === menuName) setFavorited(favorited);
      if (favorited) trackAccept('favorite', menuName);
    } catch (e) {
      Alert.alert("에러", "즐겨찾기 저장에 실패했습니다.");
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
            {CUISINES.map((genre, idx) => {
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
                    {CUISINE_EMOJI[genre]}
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

          <TouchableOpacity style={styles.startButton} onPress={() => startAkinator()}>
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
              <Text style={styles.progressText}>질문 {questionNumber} / {questionLimit}</Text>
              <Text style={styles.poolCountText}>후보 메뉴 {session?.candidates.length ?? 0}개</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(questionNumber / questionLimit, 1) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Question Text */}
          <View style={styles.questionCard}>
            <Text style={styles.questionIcon}>🐣</Text>
            <Text style={styles.questionText}>{currentQuestion.text}</Text>
          </View>

          {/* 답변 4개: 엄지로 누르기 쉽게 2 x 2 */}
          <View style={styles.answerGrid}>
            {ANSWER_BUTTONS.map(({ answer, label }) => (
              <TouchableOpacity
                key={answer}
                style={[styles.answerCell, styles[`answer_${answer}`]]}
                onPress={() => handleAnswer(answer)}
                activeOpacity={0.85}
              >
                <Text style={styles.btnAnswerText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 귀찮으면 지금 점수로 바로 결과 (3번째 질문부터) */}
          {questionNumber >= SHOW_SKIP_FROM_QUESTION && session && (
            <TouchableOpacity style={styles.skipButton} onPress={() => finishAkinator(session)}>
              <Text style={styles.skipButtonText}>바로 결과 보기 ➔</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.resetButtonText}>처음으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2-1. 두 번째 "틀렸어요": 남은 상위 4개로 월드컵 (US-15) */}
      {gameState === 'worldcup' && worldCupResults.length >= 2 && (
        <ScrollView contentContainerStyle={styles.revealContainer}>
          <MiniWorldCup
            menus={worldCupResults.map(r => r.item)}
            title="메추리가 헷갈려요. 직접 골라 주세요!"
            onWinner={handleWorldCupWinner}
          />
          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.resetButtonText}>처음으로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 3. 추천 결과 단계 */}
      {gameState === 'reveal' && (
        <ScrollView style={styles.scrollReveal} contentContainerStyle={styles.revealContainer} showsVerticalScrollIndicator={false}>
          {results[0] && (
            <Animated.View
              style={[
                styles.revealHero,
                { opacity: revealAnim, transform: [{ scale: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }
              ]}
            >
              <Text style={styles.revealLead}>{isRetry ? '그렇다면 이 메뉴는…' : '당신이 생각한 메뉴는…'}</Text>
              <Text style={styles.revealEmoji}>{results[0].item.emoji}</Text>
              <Text style={styles.revealName} testID="reveal-name">{results[0].item.name}!</Text>
              <View style={styles.reasonRow}>
                {results[0].reasons.map(reason => (
                  <View key={reason} style={styles.reasonChip}>
                    <Text style={styles.reasonChipText}>{reason}</Text>
                  </View>
                ))}
              </View>

              {/* 결과에서 바로 실행 (US-20) */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleNearby(results[0].item)}>
                  <Text style={styles.actionIcon}>📍</Text>
                  <Text style={styles.actionLabel}>근처 식당</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenBaemin(results[0].item.name)}>
                  <Text style={styles.actionIcon}>🛵</Text>
                  <Text style={styles.actionLabel}>배달</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary, eatenMenu === results[0].item.name && styles.actionDone]}
                  onPress={() => handleEatThis(results[0].item)}
                  disabled={eatenMenu === results[0].item.name}
                >
                  <Text style={styles.actionIcon}>😋</Text>
                  <Text style={[styles.actionLabel, styles.actionPrimaryLabel]}>
                    {eatenMenu === results[0].item.name ? '맛있게 드세요!' : '이거 먹을래요'}
                  </Text>
                </TouchableOpacity>
              </View>

              {session && canReject(session) && (
                <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
                  <Text style={styles.rejectButtonText}>
                    {session.rejected.length >= 1 ? '또 틀렸어요, 월드컵으로 정할래요' : '틀렸어요 🙅'}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* 대안 2개: 누르면 1위 자리로 */}
          {results.length > 1 && (
            <View style={styles.altSection}>
              <Text style={styles.altTitle}>이건 어때요?</Text>
              <View style={styles.altRow}>
                {results.slice(1).map((r, i) => (
                  <TouchableOpacity
                    key={r.item.name}
                    style={styles.altCard}
                    onPress={() => promoteAlternative(i + 1)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.altEmoji}>{r.item.emoji}</Text>
                    <Text style={styles.altName} testID="alt-name">{r.item.name}</Text>
                    <Text style={styles.altReason} numberOfLines={1}>{r.reasons.join(' · ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 선택된 음식 상세 설명 패널 */}
          {selectedMenu && (
            <View style={styles.selectedDetailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{selectedMenu.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.detailTitle}>{selectedMenu.name}</Text>
                    <TouchableOpacity onPress={handleToggleFavorite} style={styles.heartBtn}>
                      <Text style={{ fontSize: 20 }}>{favorited ? '❤️' : '🤍'}</Text>
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    alignSelf: 'stretch',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fde7c0',
  },
  actionPrimary: {
    flex: 1.4,
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
  },
  actionDone: {
    backgroundColor: '#c9b48f',
    borderColor: '#c9b48f',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b2f1e',
  },
  actionPrimaryLabel: {
    color: '#ffffff',
  },
  rejectButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9a8a74',
    textDecorationLine: 'underline',
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  answerCell: {
    width: '48.5%',
    minHeight: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  answer_yes: { backgroundColor: '#16a34a' },
  answer_probably: { backgroundColor: '#65a30d' },
  answer_dontcare: { backgroundColor: '#57534e' },
  answer_no: { backgroundColor: '#dc2626' },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    marginTop: 4,
  },
  skipButtonText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '700',
  },
  revealHero: {
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  revealLead: {
    color: '#d6d3d1',
    fontSize: 15,
    marginBottom: 8,
  },
  revealEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  revealName: {
    color: '#fbbf24',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reasonChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 3,
  },
  reasonChipText: {
    color: '#f5f5f4',
    fontSize: 13,
    fontWeight: '600',
  },
  altSection: {
    marginBottom: 18,
  },
  altTitle: {
    color: '#a8a29e',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  altCard: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  altEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  altName: {
    color: '#f5f5f4',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  altReason: {
    color: '#a8a29e',
    fontSize: 12,
  },
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
    padding: 12,
    marginBottom: 12,
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
