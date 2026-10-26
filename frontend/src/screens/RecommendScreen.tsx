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
import { colors, fonts } from '../theme';
import { openDelivery } from '../utils/openDelivery';
import { shareResult } from '../utils/shareResult';
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
import { RETRY_WORLDCUP_SIZE, SHOW_SKIP_FROM_QUESTION, ScoreAnswer, WEATHER_WAIT_MS } from '../engine/config';
import { personalAdjustments } from '../engine/personalize';
import { RecommendContext, contextAdjustments, mergeAdjustments } from '../engine/context';


const ANSWER_BUTTONS: { answer: ScoreAnswer; label: string }[] = [
  { answer: 'yes', label: '👍 예' },
  { answer: 'probably', label: '🙂 아마도' },
  { answer: 'dontcare', label: '🤷 상관없음' },
  { answer: 'no', label: '👎 아니오' }
];

// /api/restaurants 응답 (backend/src/routes/restaurant.js). 평점은 주지 않고, type은 있을 때만 온다
interface Restaurant {
  name: string;
  distance: string;
  category: string;
  url: string;
  address: string;
  latitude?: number;
  longitude?: number;
  type?: string;
}

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
  // "이전 질문" 되돌리기용: 답하기 직전 상태들 (이번 판, 이번 "틀렸어요" 구간만)
  const [history, setHistory] = useState<{ session: RecommendSession; question: Question }[]>([]);
  // 결과 계산은 기록을 불러오느라 비동기라, 그사이 되돌리기·새 판이 시작되면 늦게 온 결과를 버린다
  const finishTokenRef = useRef(0);

  // 결과: [0]이 지금 보여주는 메뉴, 나머지가 대안
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  // 결과 계산에 쓴 개인화 보정. "틀렸어요" 뒤 다시 계산할 때도 같은 값을 쓴다
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [contextReasons, setContextReasons] = useState<Record<string, string>>({});
  const [worldCupResults, setWorldCupResults] = useState<RecommendResult[]>([]);
  // 추천을 시작할 때 미리 받아 두는 날씨 (L-02). 못 받으면 시간대만 쓴다
  const weatherRef = useRef<RecommendContext['weather']>(null);
  // 추천 한 판마다 올라가는 번호. 이전 판의 늦은 날씨 응답이 새 판을 덮지 않게 한다
  const weatherRoundRef = useRef(0);
  // 시작 요청마다 올라간다. 기피 태그를 읽는 사이 다시 시작했거나 초기화했으면 이전 요청은 버린다
  const startRequestRef = useRef(0);
  // 질문 화면에 떠 있는 판을 시작한 요청 번호. startRequestRef보다 작으면 새 시작이 진행 중이다
  const activeStartRequestRef = useRef(0);
  const weatherPromiseRef = useRef<Promise<void> | null>(null);
  // 이번 결과에서 "먹을래요"로 저장한 메뉴들 (여러 메뉴의 저장이 엇갈려 끝나도 표시가 지워지지 않게)
  const [eatenMenus, setEatenMenus] = useState<string[]>([]);
  const [favorited, setFavorited] = useState(false);
  const selectedNameRef = useRef<string | null>(null);
  // 지표용 추천 세션 ID (US-23). 추천 한 판마다 새로 만든다
  const analyticsSessionRef = useRef<string | null>(null);
  // 저장을 기다리는 동작은 누른 순간의 세션을 넘긴다. 그사이 새 추천을 시작해도 이전 판에 기록된다
  const trackAccept = (action: AcceptAction, menu: string, sessionId = analyticsSessionRef.current) =>
    track(sessionId, { type: 'accept', payload: { action, menu } });
  // 하트 조회·토글마다 올라가는 번호. 늦게 온 이전 결과가 하트를 되돌리지 않게 한다
  const favoriteOpRef = useRef(0);
  // 하트 저장은 하나씩 차례로 한다. 게스트 목록은 읽고-고쳐-쓰기라 겹치면 앞 변경이 사라진다
  const favoriteQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  // 새 판을 시작할 때마다 올라가는 번호. 이전 판의 저장이 늦게 끝나도 새 판의 "먹을래요" 표시를 건드리지 않는다
  const eatRoundRef = useRef(0);
  const revealAnim = useRef(new Animated.Value(0)).current;

  // 지금 묻는 질문 번호 (1부터)
  const questionNumber = (session?.answers.length ?? 0) + 1;
  const questionLimit = session?.questionLimit ?? 7;
  const isRetry = (session?.rejected.length ?? 0) > 0;

  // GPS 위치 및 백엔드 통신용 상태값
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  // 추천 시작은 기피 태그를 기다린 뒤 좌표를 읽는다. 그사이 잡힌 GPS를 놓치지 않게 최신 값을 따로 둔다
  const userCoordsRef = useRef<{ latitude: number, longitude: number } | null>(null);
  const updateUserCoords = (coords: { latitude: number, longitude: number } | null) => {
    userCoordsRef.current = coords;
    setUserCoords(coords);
  };
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  // 식당 검색이 실패했는지. 실패하면 가짜 식당 대신 다시 시도 버튼을 보여 준다
  const [restaurantError, setRestaurantError] = useState(false);
  // 지금 보이는 식당 목록을 강남역 기준으로 찾았는지. 검색 뒤에 GPS가 잡혀도 제목이 바뀌지 않게 검색할 때 정한다
  const [restaurantFallback, setRestaurantFallback] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          updateUserCoords({
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

  // 화면이 사라지면 진행 중이던 판을 끝낸다. 늦게 끝난 비동기 작업이 결과 이벤트를 보내지 않는다
  useEffect(() => () => {
    analyticsSessionRef.current = null;
  }, []);

  // 홈의 "바로 추천"은 autoStart 값을 바꿔 보낸다. 인트로를 건너뛰고 첫 질문부터 시작한다
  const autoStart = route?.params?.autoStart;
  useEffect(() => {
    if (autoStart) startAkinator([], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // 아키네이터 인트로 셋업 및 초기화
  const resetGame = () => {
    startRequestRef.current += 1;
    eatRoundRef.current += 1;
    setExcludedCategories([]);
    setSession(null);
    setCurrentQuestion(null);
    setHistory([]);
    setResults([]);
    setSelectedMenu(null);
    setAdjustments({});
    setContextReasons({});
    setWorldCupResults([]);
    setEatenMenus([]);
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
        updateUserCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      } else {
        // 권한이 없으면 예전 좌표로 "내 주변"이라고 찾지 않는다
        updateUserCoords(null);
      }
    } catch (e) {
      console.log('GPS Refresh Failed');
      updateUserCoords(null);
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
    const startRequest = ++startRequestRef.current;
    // 사전 제외 장르 + 마이페이지에서 설정한 기피 성분(avoidTags)은 시작 전에 후보에서 뺀다
    let avoidTags: string[] = [];
    try {
      avoidTags = await getAvoidTags();
    } catch (e) {
      console.log("Failed to load user avoid tags on setup", e);
    }
    if (startRequestRef.current !== startRequest) return;
    const first = toRecommendSession(createScoreSession(MENU_DATA, { avoidTags, excludedCategories: excluded }));

    if (first.candidates.length === 0) {
      // 새 판을 못 열었으니 지금 판을 계속 진행할 수 있게 진행 중 표시를 거둔다
      if (startRequestRef.current === startRequest) startRequestRef.current = activeStartRequestRef.current;
      Alert.alert("경고 ⚠️", "제외한 장르와 기피 재료 때문에 남은 메뉴가 없어요. 조건을 조금 풀어 주세요.");
      return;
    }

    activeStartRequestRef.current = startRequest;
    eatRoundRef.current += 1;
    weatherRoundRef.current += 1;
    weatherRef.current = null;
    const coords = userCoordsRef.current;
    weatherPromiseRef.current = coords ? loadWeather(coords, weatherRoundRef.current) : null;
    finishTokenRef.current += 1;
    analyticsSessionRef.current = newSessionId();
    track(analyticsSessionRef.current, { type: 'rec_start', payload: { autoStart: auto, excluded } });

    setHistory([]);
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
    setHistory([...history, { session, question: currentQuestion }]);
    setSession(next);
    goNext(next);
  };

  // 잘못 누른 답을 되돌린다. 결과 화면에서도 마지막 답을 고칠 수 있다
  const handleUndo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    finishTokenRef.current += 1; // 계산 중인 결과가 있으면 버린다
    eatRoundRef.current += 1; // 이전 결과에서 저장 중이던 "먹을래요"가 새 결과에 표시되지 않게 한다
    setHistory(history.slice(0, -1));
    setSession(prev.session);
    setCurrentQuestion(prev.question);
    setResults([]);
    setSelectedMenu(null);
    setRestaurantsList([]);
    setGameState('questioning');
  };

  // 결과 계산: 답변 점수 + 최근 먹은 메뉴 감점
  const loadWeather = async (coords: { latitude: number, longitude: number }, round: number) => {
    try {
      const res = await apiFetch(`/api/weather?lat=${coords.latitude}&lng=${coords.longitude}`, { auth: false, timeoutMs: 3000 });
      if (res.ok) {
        const data = await res.json();
        if (weatherRoundRef.current === round) weatherRef.current = { condition: data.condition, temperature: data.temperature };
      }
    } catch (e) {
      console.log("Weather unavailable, using time of day only");
    }
  };

  // 추천을 시작한 뒤에 GPS가 잡히면 그때 날씨를 받는다
  useEffect(() => {
    if (userCoords && weatherRoundRef.current > 0 && !weatherPromiseRef.current) {
      weatherPromiseRef.current = loadWeather(userCoords, weatherRoundRef.current);
    }
  }, [userCoords]);

  // 날씨가 아직 오는 중이면 잠깐만 기다린다. 늦으면 시간대만으로 보정한다
  const waitForWeather = async () => {
    const pending = weatherPromiseRef.current;
    if (!pending) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([pending, new Promise<void>(resolve => (timer = setTimeout(resolve, WEATHER_WAIT_MS)))]);
    clearTimeout(timer);
  };

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
    setEatenMenus([]);
    setGameState('reveal');
    revealAnim.setValue(0);
    Animated.spring(revealAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();

    if (ranked.length > 0) {
      onSelectMenu(ranked[0].item);
    }
  };

  const finishAkinator = async (finalSession: RecommendSession) => {
    // 새 시작 요청은 기피 태그를 읽는 동안 판 번호를 아직 올리지 않았으므로 요청 번호도 본다.
    // 새 판이 열리는 중이면 지금 판의 결과는 계산하지 않는다
    const startRequest = activeStartRequestRef.current;
    if (startRequestRef.current !== startRequest) return;
    const token = ++finishTokenRef.current;
    setCurrentQuestion(null);
    // 추천을 시작할 때마다 올라가는 판 번호
    const round = weatherRoundRef.current;
    // 화면을 떠나면 판이 끝난다 (analyticsSessionRef가 비워짐)
    const analyticsSession = analyticsSessionRef.current;
    // "틀렸어요" 뒤에는 처음 계산한 보정값을 그대로 쓴다
    let adj = adjustments;
    let reasons = contextReasons;
    if (finalSession.rejected.length === 0) {
      await waitForWeather();
      const context = contextAdjustments(MENU_DATA, { hour: new Date().getHours(), weather: weatherRef.current });
      const personal = await loadAdjustments();
      // 날씨·보정값을 기다리는 사이 새 추천을 시작했거나, 답을 되돌렸거나, 화면을 떠났으면 이전 결과를 띄우지 않는다
      if (
        token !== finishTokenRef.current ||
        weatherRoundRef.current !== round ||
        analyticsSessionRef.current !== analyticsSession ||
        startRequestRef.current !== startRequest
      ) return;
      adj = mergeAdjustments(personal, context.adjustments);
      reasons = context.reasons;
      setAdjustments(adj);
      setContextReasons(reasons);
    }
    showResults(getResults(finalSession, QUESTIONS, adj, undefined, reasons), finalSession);
  };

  // "틀렸어요" (US-15): 1위를 빼고 질문을 2~3개 더. 두 번째부터는 남은 상위 4개로 월드컵
  const handleReject = () => {
    const top = results[0];
    if (!session || !top || !canReject(session)) return;
    const next = rejectTopResult(session, top.item.name);
    // retries는 이번 것을 포함한 "틀렸어요" 횟수. 뒤따르는 result_shown의 retries와 같다
    track(analyticsSessionRef.current, { type: 'reject', payload: { menu: top.item.name, retries: next.rejected.length } });
    setHistory([]);
    setSession(next);
    setSelectedMenu(null);
    setRestaurantsList([]);

    if (session.rejected.length >= 1) {
      const cup = getResults(next, QUESTIONS, adjustments, RETRY_WORLDCUP_SIZE, contextReasons);
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
    const favoriteOp = ++favoriteOpRef.current;
    isFavorite(menu.name)
      .then(f => { if (favoriteOpRef.current === favoriteOp) setFavorited(f); })
      .catch(() => {});
    setLoadingRestaurants(true);
    setRestaurantsList([]);
    setRestaurantError(false);

    const coords = userCoordsRef.current;
    setRestaurantFallback(!coords);

    try {
      const lat = coords?.latitude ?? '37.497942';
      const lng = coords?.longitude ?? '127.0276197';
      const url = `/api/restaurants?keyword=${encodeURIComponent(menu.name)}&x=${lng}&y=${lat}`;

      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        if (isLatest()) setRestaurantsList(data.restaurants || []);
      } else if (isLatest()) {
        setRestaurantError(true);
      }
    } catch (error) {
      if (isLatest()) setRestaurantError(true);
    } finally {
      if (isLatest()) setLoadingRestaurants(false);
    }
  };

  const handleOpenMap = async (res: Restaurant) => {
    if (!selectedMenu) return;
    trackAccept('restaurant', selectedMenu.name);
    // 지도로 식당을 살펴보는 것만으로는 먹은 기록을 남기지 않는다. 기록은 "이거 먹을래요"에서만 (최근 먹은 메뉴 감점에 쓰임)
    console.log("📡 Navigating to in-app map screen with restaurant param:", res.name);
    navigation.navigate("지도", { restaurant: res });
  };

  const handleOpenBaemin = async (menuName: string) => {
    const analyticsSession = analyticsSessionRef.current;
    const opened = await openDelivery(menuName);
    if (opened === 'failed') {
      Alert.alert("배달 앱을 열지 못했어요", "배달의민족 앱이나 브라우저를 확인해 주세요.");
      return;
    }
    // 배달 앱이나 웹을 실제로 연 경우만 수락으로 센다
    trackAccept('delivery', menuName, analyticsSession);
  };

  // "근처 식당" (US-20): 지도 탭에서 이 메뉴로 반경 1.5km 검색
  const handleNearby = (menu: MenuItem) => {
    trackAccept('restaurant', menu.name);
    navigation.navigate("지도", { keyword: menu.name, requestedAt: Date.now() });
  };

  // "이거 먹을래요" (US-20): 먹은 기록으로 남긴다 (게스트는 기기에)
  // 저장 중에 같은 메뉴를 한 번 더 눌러도 기록이 두 번 남지 않게 막는다 (다른 메뉴는 따로 저장)
  const savingMenusRef = useRef(new Set<string>());
  const handleEatThis = async (menu: MenuItem) => {
    const round = eatRoundRef.current;
    const savingKey = `${round}:${menu.name}`;
    if (savingMenusRef.current.has(savingKey)) return;
    savingMenusRef.current.add(savingKey);
    const analyticsSession = analyticsSessionRef.current;
    try {
      await addHistory({ menuName: menu.name, emoji: menu.emoji, category: menu.category });
      if (round === eatRoundRef.current) {
        setEatenMenus(prev => (prev.includes(menu.name) ? prev : [...prev, menu.name]));
      }
      trackAccept('eat', menu.name, analyticsSession);
    } catch (e) {
      console.log("Failed to save eaten history", e);
      Alert.alert("기록하지 못했어요", "잠시 후 다시 눌러 주세요.");
    } finally {
      savingMenusRef.current.delete(savingKey);
    }
  };

  // 하트: 게스트도 기기에 저장한다. 로그인 안내는 저장소가 정한 때(3개째)만 뜬다 (US-17)
  const handleToggleFavorite = async () => {
    if (!selectedMenu) return;
    const menuName = selectedMenu.name;
    const favoriteOp = ++favoriteOpRef.current;
    const analyticsSession = analyticsSessionRef.current;
    const item = { menuName, emoji: selectedMenu.emoji, category: selectedMenu.category };
    const saving = favoriteQueueRef.current.then(() => toggleFavorite(item));
    favoriteQueueRef.current = saving.catch(() => undefined);
    try {
      const { favorited } = await saving;
      // 저장하는 사이 다른 메뉴를 골랐거나 다시 조회했으면 덮어쓰지 않는다
      if (favoriteOpRef.current === favoriteOp && selectedNameRef.current === menuName) setFavorited(favorited);
      if (favorited) trackAccept('favorite', menuName, analyticsSession);
    } catch (e) {
      // 앞선 저장은 됐는데 이번 저장만 실패했을 수 있으니, 실제 저장 상태를 다시 읽어 하트를 맞춘다
      if (favoriteOpRef.current === favoriteOp && selectedNameRef.current === menuName) {
        isFavorite(menuName)
          .then(f => { if (favoriteOpRef.current === favoriteOp && selectedNameRef.current === menuName) setFavorited(f); })
          .catch(() => {});
      }
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
                <Text style={[styles.btnAnswerText, styles[`answerText_${answer}`]]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {history.length > 0 && (
            <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
              <Text style={styles.undoButtonText}>← 이전 질문</Text>
            </TouchableOpacity>
          )}

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
                  style={[styles.actionBtn, styles.actionPrimary, eatenMenus.includes(results[0].item.name) && styles.actionDone]}
                  onPress={() => handleEatThis(results[0].item)}
                  disabled={eatenMenus.includes(results[0].item.name)}
                >
                  <Text style={styles.actionIcon}>😋</Text>
                  <Text style={[styles.actionLabel, styles.actionPrimaryLabel]}>
                    {eatenMenus.includes(results[0].item.name) ? '맛있게 드세요!' : '이거 먹을래요'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.shareButton} onPress={() => shareResult(results[0].item, results[0].reasons)}>
                <Text style={styles.shareButtonText}>📤 친구에게 공유하기</Text>
              </TouchableOpacity>

              {history.length > 0 && (
                <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
                  <Text style={styles.undoButtonText}>← 마지막 답 고치기</Text>
                </TouchableOpacity>
              )}

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
                📍 {restaurantFallback ? '강남역 근처' : '내 주변'} {selectedMenu.name} 식당
              </Text>
              {restaurantFallback && (
                <Text style={styles.restaurantHint}>현재 위치를 확인하지 못해 강남역 기준으로 찾았어요</Text>
              )}
              
              {loadingRestaurants ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.feather} />
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
                            {!!res.type && <Text style={styles.resBadge}>{res.type}</Text>}
                          </View>
                          <Text style={styles.resMeta} numberOfLines={1}>{[res.distance, res.category].filter(Boolean).join(' • ')}</Text>
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
                ) : restaurantError ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>식당 정보를 불러오지 못했어요</Text>
                    <View style={styles.emptyActions}>
                      <TouchableOpacity style={styles.emptyButton} onPress={() => onSelectMenu(selectedMenu)}>
                        <Text style={styles.emptyButtonText}>다시 시도</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.emptyButton} onPress={() => handleOpenBaemin(selectedMenu.name)}>
                        <Text style={styles.emptyButtonText}>배달로 찾기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>근처 1.5km 안에 {selectedMenu.name} 가게가 없어요</Text>
                    <View style={styles.emptyActions}>
                      <TouchableOpacity style={styles.emptyButton} onPress={() => handleOpenBaemin(selectedMenu.name)}>
                        <Text style={styles.emptyButtonText}>배달로 찾기</Text>
                      </TouchableOpacity>
                    </View>
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
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.yolkSoft,
  },
  actionPrimary: {
    flex: 1.4,
    backgroundColor: colors.yolk,
    borderColor: colors.yolk,
  },
  actionDone: {
    backgroundColor: colors.shell,
    borderColor: colors.shell,
  },
  actionIcon: {
    fontFamily: fonts.body,
    fontSize: 20,
    marginBottom: 2,
  },
  actionLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  actionPrimaryLabel: {
    color: colors.ink,
  },
  undoButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  undoButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.muted,
  },
  shareButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  shareButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.feather,
  },
  rejectButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  rejectButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.muted,
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
  answer_yes: { backgroundColor: colors.leaf },
  answer_probably: { backgroundColor: colors.yolk },
  answer_dontcare: { backgroundColor: colors.shell },
  answer_no: { backgroundColor: colors.chili },
  answerText_yes: { color: colors.surface },
  answerText_probably: { color: colors.ink },
  answerText_dontcare: { color: colors.ink },
  answerText_no: { color: colors.surface },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.feather,
    marginTop: 4,
  },
  skipButtonText: {
    fontFamily: fonts.bold,
    color: colors.feather,
    fontSize: 14,
  },
  revealHero: {
    alignItems: 'center',
    backgroundColor: colors.yolkSoft,
    borderColor: colors.feather,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  revealLead: {
    fontFamily: fonts.body,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 8,
  },
  revealEmoji: {
    fontFamily: fonts.body,
    fontSize: 56,
    marginBottom: 4,
  },
  revealName: {
    fontFamily: fonts.bold,
    color: colors.feather,
    fontSize: 30,
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reasonChip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 3,
  },
  reasonChipText: {
    fontFamily: fonts.medium,
    color: colors.ink,
    fontSize: 13,
  },
  altSection: {
    marginBottom: 18,
  },
  altTitle: {
    fontFamily: fonts.bold,
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  altCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  altEmoji: {
    fontFamily: fonts.body,
    fontSize: 30,
    marginBottom: 4,
  },
  altName: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 2,
  },
  altReason: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 12,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
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
    fontFamily: fonts.body,
    fontSize: 54,
    marginBottom: 12,
  },
  introTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.feather,
    marginBottom: 10,
  },
  introSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
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
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  genreButtonExcluded: {
    backgroundColor: colors.chiliSoft,
    borderColor: colors.chili,
  },
  genreEmoji: {
    fontFamily: fonts.body,
    fontSize: 32,
    marginBottom: 8,
  },
  genreLabel: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 4,
  },
  genreLabelExcluded: {
    color: colors.chiliText,
  },
  genreStatusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.feather,
  },
  genreStatusTextExcluded: {
    color: colors.chiliText,
  },
  startButton: {
    backgroundColor: colors.yolk,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startButtonText: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 15,
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
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
  },
  poolCountText: {
    fontFamily: fonts.bold,
    color: colors.feather,
    fontSize: 11,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.yolk,
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 30,
    borderWidth: 1,
    borderColor: colors.feather,
    marginVertical: 14,
    alignItems: 'center',
  },
  questionIcon: {
    fontFamily: fonts.body,
    fontSize: 40,
    marginBottom: 12,
  },
  questionText: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 18,
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
    fontFamily: fonts.bold,
    fontSize: 14.5,
  },
  resetButton: {
    paddingVertical: 6,
    alignSelf: 'center',
  },
  resetButtonText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
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
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.feather,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailEmoji: {
    fontFamily: fonts.body,
    fontSize: 48,
    marginRight: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
  },
  heartBtn: {
    padding: 4,
  },
  detailCategory: {
    fontFamily: fonts.bold,
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 2,
  },
  detailDesc: {
    fontFamily: fonts.body,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  baeminSearchBtn: {
    backgroundColor: colors.yolk,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  baeminSearchText: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 13,
  },
  restaurantsSection: {
    marginBottom: 24,
  },
  restaurantSectionTitle: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 14.5,
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 11,
    marginTop: 8,
  },
  restaurantCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
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
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 13.5,
    maxWidth: '70%',
  },
  resBadge: {
    fontFamily: fonts.bold,
    backgroundColor: colors.yolkSoft,
    color: colors.feather,
    fontSize: 8.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  resMeta: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 10.5,
    marginBottom: 2,
  },
  resAddress: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 10.5,
  },
  navButton: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonText: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 10.5,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 11.5,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  emptyButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.feather,
  },
  emptyButtonText: {
    fontFamily: fonts.bold,
    color: colors.feather,
    fontSize: 12,
  },
  restaurantHint: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 11,
    marginTop: -6,
    marginBottom: 10,
  },
  retryButton: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  retryButtonText: {
    fontFamily: fonts.bold,
    color: colors.muted,
    fontSize: 13,
  },
});
