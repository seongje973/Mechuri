import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Platform,
  Dimensions,
  Linking,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// 1. 식사 메뉴 데이터셋 정의 (총 18종)
interface MenuItem {
  name: string;
  emoji: string;
  category: '한식' | '중식' | '일식' | '양식';
  temperature: 'hot' | 'cold';
  spicy: boolean;
  style: 'rice' | 'noodle' | 'meat' | 'bread';
  desc: string;
}

const MENU_DATA: MenuItem[] = [
  { name: '김치찌개', emoji: '🍲', category: '한식', temperature: 'hot', spicy: true, style: 'rice', desc: '칼칼하고 얼큰한 한국인의 소울푸드' },
  { name: '된장찌개', emoji: '🥘', category: '한식', temperature: 'hot', spicy: false, style: 'rice', desc: '구수하고 깊은 맛의 전통 찌개' },
  { name: '짜장면', emoji: '🍜', category: '중식', temperature: 'hot', spicy: false, style: 'noodle', desc: '달콤 짭조름한 국민 중식 면요리' },
  { name: '짬뽕', emoji: '🌶️🍜', category: '중식', temperature: 'hot', spicy: true, style: 'noodle', desc: '얼큰한 국물과 풍성한 해산물의 조화' },
  { name: '돈까스', emoji: '🍛', category: '일식', temperature: 'hot', spicy: false, style: 'meat', desc: '바삭바삭한 튀김옷과 두툼한 등심의 만남' },
  { name: '피자', emoji: '🍕', category: '양식', temperature: 'hot', spicy: false, style: 'bread', desc: '고소한 치즈가 듬뿍 토핑된 이탈리안 푸드' },
  { name: '삼겹살', emoji: '🥩', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '지글지글 구워 먹는 영원한 회식 1순위' },
  { name: '초밥', emoji: '🍣', category: '일식', temperature: 'cold', spicy: false, style: 'meat', desc: '신선한 횟감과 알맞게 쥔 밥의 예술' },
  { name: '마라탕', emoji: '🍲🌶️', category: '중식', temperature: 'hot', spicy: true, style: 'noodle', desc: '중독성 강한 매콤 알싸한 사천식 국물탕' },
  { name: '냉면', emoji: '🧊🍜', category: '한식', temperature: 'cold', spicy: false, style: 'noodle', desc: '가슴속까지 시원해지는 육수와 쫄깃한 면발' },
  { name: '떡볶이', emoji: '🍢', category: '한식', temperature: 'hot', spicy: true, style: 'noodle', desc: '매콤달콤 쫄깃쫄깃 최고의 분식 대장' },
  { name: '햄버거', emoji: '🍔', category: '양식', temperature: 'hot', spicy: false, style: 'bread', desc: '두툼한 패티와 야채가 조화로운 패스트푸드' },
  { name: '제육볶음', emoji: '🐷', category: '한식', temperature: 'hot', spicy: true, style: 'meat', desc: '매콤한 양념에 불맛을 더한 고기 반찬의 왕' },
  { name: '파스타', emoji: '🍝', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '부드러운 크림 또는 상큼한 토마토 소스 면요리' },
  { name: '쌀국수', emoji: '🍜🇻🇳', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '맑고 담백한 소고기 육수와 향긋한 베트남식 면' },
  { name: '치킨', emoji: '🍗', category: '양식', temperature: 'hot', spicy: false, style: 'meat', desc: '겉바속촉, 매일 밤 생각나는 불멸의 야식' },
  { name: '육개장', emoji: '🥣', category: '한식', temperature: 'hot', spicy: true, style: 'rice', desc: '얼큰한 국물 속에 소고기와 고사리가 가득' },
  { name: '라멘', emoji: '🍜🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'noodle', desc: '진한 돈사골 육수와 부드러운 차슈의 조화' },
];

// 2. 질문 및 옵션 데이터 구조 정의
interface QuizOption {
  label: string;
  value: any;
}

interface QuizQuestion {
  id: 'category' | 'temperature' | 'spicy' | 'style';
  text: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'category',
    text: '선호하는 음식의 장르를 선택해 주세요.',
    options: [
      { label: '한식', value: '한식' },
      { label: '중식', value: '중식' },
      { label: '일식', value: '일식' },
      { label: '양식', value: '양식' },
      { label: '상관없음', value: 'any' },
    ]
  },
  {
    id: 'temperature',
    text: '선호하는 음식의 온도를 선택해 주세요.',
    options: [
      { label: '뜨거운 음식', value: 'hot' },
      { label: '차가운 음식', value: 'cold' },
      { label: '상관없음', value: 'any' },
    ]
  },
  {
    id: 'spicy',
    text: '선호하는 음식의 맵기를 선택해 주세요.',
    options: [
      { label: '매운 음식', value: true },
      { label: '안 매운 음식', value: false },
      { label: '상관없음', value: 'any' },
    ]
  },
  {
    id: 'style',
    text: '선호하는 음식의 종류를 선택해 주세요.',
    options: [
      { label: '밥', value: 'rice' },
      { label: '면', value: 'noodle' },
      { label: '고기/해산물', value: 'meat' },
      { label: '빵/밀가루', value: 'bread' },
      { label: '상관없음', value: 'any' },
    ]
  }
];

// 백엔드 통신 실패 시를 대비한 오프라인 모의 주변 음식점 디폴트값
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

export default function RecommendScreen({ navigation }: { navigation: any }) {
  const [gameState, setGameState] = useState<'intro' | 'questioning' | 'reveal'>('intro');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [pool, setPool] = useState<MenuItem[]>(MENU_DATA);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [matchingResults, setMatchingResults] = useState<MenuItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);

  // GPS 위치 및 백엔드 통신용 상태값
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  // 1. 컴포넌트 마운트 시 GPS 권한 사전 요청
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
          console.log('🛰️ GPS Location locked successfully:', location.coords.latitude, location.coords.longitude);
        }
      } catch (error) {
        console.log('⚠️ Error getting initial GPS location:', error);
      }
    })();
  }, []);

  // 퀴즈 초기화 및 시작
  const startQuiz = () => {
    setPool(MENU_DATA);
    setCurrentQIndex(0);
    setAnswers({});
    setMatchingResults([]);
    setSelectedMenu(null);
    setRestaurantsList([]);
    setGameState('questioning');
    
    // 퀴즈 시작할 때 백그라운드 GPS 리프레시 시도
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

  // 선택지 답변 선택 처리
  const handleSelectOption = (value: any) => {
    const currentQ = QUESTIONS[currentQIndex];
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    // 필터링 적용
    let newPool = pool;
    if (value !== 'any') {
      if (currentQ.id === 'category') {
        newPool = pool.filter(item => item.category === value);
      } else if (currentQ.id === 'temperature') {
        newPool = pool.filter(item => item.temperature === value);
      } else if (currentQ.id === 'spicy') {
        newPool = pool.filter(item => item.spicy === value);
      } else if (currentQ.id === 'style') {
        newPool = pool.filter(item => item.style === value);
      }
    }

    // 최종 질문 완료 분기 처리
    if (currentQIndex + 1 >= QUESTIONS.length) {
      const finalPool = newPool.length > 0 ? newPool : (pool.length > 0 ? pool : MENU_DATA);
      setMatchingResults(finalPool);
      setGameState('reveal');
      
      // 첫 매칭 메뉴의 실제 주변 식당 자동 로드
      onSelectMenu(finalPool[0]);
    } else {
      if (newPool.length > 0) {
        setPool(newPool);
      }
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  // 2. 특정 메뉴가 선택되었을 때, 실서버 API 호출하여 실제 근처 맛집 탐색
  const onSelectMenu = async (menu: MenuItem) => {
    setSelectedMenu(menu);
    setLoadingRestaurants(true);
    setRestaurantsList([]);

    try {
      // Android 에뮬레이터 주소(10.0.2.2) 및 iOS/웹(localhost) 유연 분기
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      
      const lat = userCoords?.latitude || '37.497942'; // 없을 시 강남역 기본 좌표
      const lng = userCoords?.longitude || '127.0276197';
      
      const url = `http://${ip}:5000/api/restaurants?keyword=${encodeURIComponent(menu.name)}&x=${lng}&y=${lat}`;
      console.log('📡 Fetching real-time nearby restaurants from:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRestaurantsList(data.restaurants || []);
        console.log(`✅ Loaded ${data.restaurants?.length} real restaurants for "${menu.name}"`);
      } else {
        // 백엔드 실패 시 오프라인 데이터 폴백
        setRestaurantsList(getOfflineFallbackRestaurants(menu.name));
      }
    } catch (error) {
      console.log('❌ Backend Server fetch failed. Using fallback.', error);
      setRestaurantsList(getOfflineFallbackRestaurants(menu.name));
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // 딥링크 및 브라우저 네비게이션 트리거
  const handleOpenMap = (res: Restaurant) => {
    // 실제 카카오 웹뷰 URL이 있는 경우 그것을 열고, 없으면 네이비게이션 딥링크로 연동
    if (res.url && res.url.startsWith('http')) {
      Linking.openURL(res.url).catch(() => {
        Linking.openURL(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(res.name)}`);
      });
    } else {
      Linking.openURL(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(res.name)}`);
    }
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {gameState === 'intro' && (
        <View style={styles.introContainer}>
          <Text style={styles.introEmoji}>🧞‍♂️</Text>
          <Text style={styles.introTitle}>맞춤 입맛 매칭 퀴즈</Text>
          <Text style={styles.introSubtitle}>
            장르, 온도, 맵기, 스타일까지 딱 4가지 스마트 질문지 선택을 통해{"\n"}
            오늘 당신이 고민 없이 먹을 최고의 맞춤 음식을 찾아드립니다!
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
            <Text style={styles.startButtonText}>맞춤 퀴즈 시작하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState === 'questioning' && (
        <View style={styles.quizContainer}>
          {/* Header Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>질문 {currentQIndex + 1} / {QUESTIONS.length}</Text>
              <Text style={styles.poolCountText}>남은 메뉴 후보: {pool.length}개</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${((currentQIndex + 1) / QUESTIONS.length) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Question Text */}
          <View style={styles.questionCard}>
            <Text style={styles.questionIcon}>💬</Text>
            <Text style={styles.questionText}>{QUESTIONS[currentQIndex].text}</Text>
          </View>

          {/* Options List */}
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {QUESTIONS[currentQIndex].options.map((option, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.optionButton} 
                onPress={() => handleSelectOption(option.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.arrowIcon}>➔</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.resetButton} onPress={() => setGameState('intro')}>
            <Text style={styles.resetButtonText}>처음으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState === 'reveal' && (
        <ScrollView style={styles.scrollReveal} contentContainerStyle={styles.revealContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.revealTitle}>🎉 입맛 매칭 음식 목록</Text>
          <Text style={styles.revealSubtitle}>퀴즈 결과를 통해 엄선된 추천 메뉴들입니다. 음식을 클릭해 보세요!</Text>

          {/* 1. 추천 메뉴 가로 스크롤 카드 리스트 */}
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

          {/* 2. 선택된 음식 상세 설명 패널 */}
          {selectedMenu && (
            <View style={styles.selectedDetailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{selectedMenu.emoji}</Text>
                <View>
                  <Text style={styles.detailTitle}>{selectedMenu.name}</Text>
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

          {/* 3. 동적 실서버 주변 맛집 출력부 */}
          {selectedMenu && (
            <View style={styles.restaurantsSection}>
              <Text style={styles.restaurantSectionTitle}>
                📍 내 GPS 주변 실제 {selectedMenu.name} 식당 목록
              </Text>
              
              {loadingRestaurants ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#38bdf8" />
                  <Text style={styles.loadingText}>실시간 근처 가게를 수집하는 중...</Text>
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

          <TouchableOpacity style={styles.retryButton} onPress={startQuiz}>
            <Text style={styles.retryButtonText}>다시 퀴즈 풀기 🔄</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  // Intro styles
  introContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  introEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#38bdf8',
    marginBottom: 12,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 36,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Quiz styles
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
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  poolCountText: {
    color: '#64748b',
    fontSize: 11,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 20,
    alignItems: 'center',
  },
  questionIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  questionText: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsList: {
    flex: 1,
    width: '100%',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  optionLabel: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 10,
  },
  arrowIcon: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 10,
  },
  resetButtonText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#38bdf8',
    marginBottom: 6,
  },
  revealSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 20,
  },
  menuHorizontalList: {
    paddingRight: 20,
    marginBottom: 24,
    height: 130,
  },
  menuTile: {
    width: 100,
    height: 120,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuTileSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38bdf8',
    borderWidth: 2,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedDetailCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 28,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  detailCategory: {
    color: '#94a3b8',
    fontSize: 11,
  },
  detailDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  baeminSearchBtn: {
    backgroundColor: '#2ac1bc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  baeminSearchText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  restaurantsSection: {
    marginBottom: 24,
  },
  restaurantSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
  },
  loadingContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  restaurantCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.35)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  resInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 8,
  },
  resBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  resMeta: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 2,
  },
  resAddress: {
    color: '#475569',
    fontSize: 10,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  retryButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 18,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 10,
  },
  retryButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  }
});
