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
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// 1. 식사 메뉴 데이터셋 정의 (총 50종 확장)
interface MenuItem {
  name: string;
  emoji: string;
  category: '한식' | '중식' | '일식' | '양식';
  temperature: 'hot' | 'cold';
  spicy: boolean;
  style: 'rice' | 'noodle' | 'meat' | 'bread';
  desc: string;
  tags: string[]; // 알레르기/기피용 태그 매핑
}

const MENU_DATA: MenuItem[] = [
  // --- 한식 (15종) ---
  { name: '김치찌개', emoji: '🍲', category: '한식', temperature: 'hot', spicy: true, style: 'rice', desc: '칼칼하고 얼큰한 한국인의 소울푸드', tags: ['매운맛'] },
  { name: '된장찌개', emoji: '🥘', category: '한식', temperature: 'hot', spicy: false, style: 'rice', desc: '구수하고 깊은 맛의 전통 찌개', tags: [] },
  { name: '삼겹살', emoji: '🥩', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '지글지글 구워 먹는 영원한 회식 1순위', tags: [] },
  { name: '제육볶음', emoji: '🐷', category: '한식', temperature: 'hot', spicy: true, style: 'meat', desc: '매콤한 양념에 불맛을 더한 고기 반찬의 왕', tags: ['매운맛'] },
  { name: '육개장', emoji: '🥣', category: '한식', temperature: 'hot', spicy: true, style: 'rice', desc: '얼큰한 국물 속에 소고기와 고사리가 가득', tags: ['매운맛'] },
  { name: '비빔밥', emoji: '🥗', category: '한식', temperature: 'cold', spicy: false, style: 'rice', desc: '다채로운 나물과 참기름 향 가득한 건강 한 끼', tags: [] },
  { name: '소불고기', emoji: '🍖', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '단짠 양념에 부드러운 소고기가 조화로운 불고기', tags: [] },
  { name: '닭갈비', emoji: '🐔', category: '한식', temperature: 'hot', spicy: true, style: 'meat', desc: '철판에 볶아 매콤달콤 쫄깃한 닭고기 요리', tags: ['매운맛'] },
  { name: '삼계탕', emoji: '🐔🍲', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '인삼과 대추를 넣어 푹 고아낸 보양식', tags: [] },
  { name: '떡볶이', emoji: '🍢', category: '한식', temperature: 'hot', spicy: true, style: 'noodle', desc: '매콤달콤 쫄깃쫄깃 최고의 국민 분식 대장', tags: ['매운맛', '밀가루'] },
  { name: '칼국수', emoji: '🍜', category: '한식', temperature: 'hot', spicy: false, style: 'noodle', desc: '진한 멸치 육수에 손맛이 살아있는 손칼국수', tags: ['밀가루'] },
  { name: '갈비탕', emoji: '🥣🥩', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '두툼한 갈빗대와 맑고 깊은 고기 육수의 조화', tags: [] },
  { name: '순대국밥', emoji: '🍲', category: '한식', temperature: 'hot', spicy: false, style: 'rice', desc: '들깨가루 듬뿍, 잡내 없이 구수한 순대국밥', tags: [] },
  { name: '족발', emoji: '🐖', category: '한식', temperature: 'cold', spicy: false, style: 'meat', desc: '쫀득하고 야들야들한 콜라겐 가득 족발', tags: [] },
  { name: '보쌈', emoji: '🥩🥬', category: '한식', temperature: 'hot', spicy: false, style: 'meat', desc: '기름기를 쏙 빼서 야들야들 담백한 수육 보쌈', tags: [] },

  // --- 중식 (11종) ---
  { name: '짜장면', emoji: '🍜', category: '중식', temperature: 'hot', spicy: false, style: 'noodle', desc: '달콤 짭조름한 국민 중식 면요리', tags: ['밀가루'] },
  { name: '짬뽕', emoji: '🌶️🍜', category: '중식', temperature: 'hot', spicy: true, style: 'noodle', desc: '얼큰한 국물과 풍성한 해산물의 조화', tags: ['매운맛', '밀가루', '해산물'] },
  { name: '탕수육', emoji: '🐖🥢', category: '중식', temperature: 'hot', spicy: false, style: 'meat', desc: '바삭하게 튀겨 달콤 새콤 소스를 끼얹은 고기', tags: ['밀가루'] },
  { name: '마라탕', emoji: '🍲🌶️', category: '중식', temperature: 'hot', spicy: true, style: 'noodle', desc: '중독성 강한 매콤 알싸한 사천식 국물탕', tags: ['매운맛', '밀가루', '해산물'] },
  { name: '마라샹궈', emoji: '🥘🌶️', category: '중식', temperature: 'hot', spicy: true, style: 'meat', desc: '알싸한 마라 양념에 다양한 재료를 볶아낸 요리', tags: ['매운맛', '해산물'] },
  { name: '볶음밥', emoji: '🍚🇨🇳', category: '중식', temperature: 'hot', spicy: false, style: 'rice', desc: '고슬고슬 불맛 가득 볶아낸 정통 중식 볶음밥', tags: [] },
  { name: '양장피', emoji: '🥗🇨🇳', category: '중식', temperature: 'cold', spicy: false, style: 'meat', desc: '겨자 소스 톡 쏘는 다채로운 해산물 잡채 요리', tags: ['해산물'] },
  { name: '깐풍기', emoji: '🐔🇨🇳', category: '중식', temperature: 'hot', spicy: true, style: 'meat', desc: '매콤달콤 깐풍 소스에 볶아낸 바삭한 닭고기', tags: ['매운맛', '밀가루'] },
  { name: '동파육', emoji: '🥩🇨🇳', category: '중식', temperature: 'hot', spicy: false, style: 'meat', desc: '입안에서 녹아내리는 극상의 부드러운 오겹살찜', tags: [] },
  { name: '어향가지', emoji: '🍆', category: '중식', temperature: 'hot', spicy: true, style: 'rice', desc: '어향 소스로 감칠맛을 극대화한 촉촉한 가지 튀김', tags: ['가지', '매운맛', '밀가루'] },
  { name: '지삼선', emoji: '🥔🍆', category: '중식', temperature: 'hot', spicy: false, style: 'rice', desc: '땅에서 나는 세 가지 보물(감자, 피망, 가지) 볶음', tags: ['가지', '밀가루'] },

  // --- 일식 (12종) ---
  { name: '돈까스', emoji: '🍛', category: '일식', temperature: 'hot', spicy: false, style: 'meat', desc: '바삭바삭한 튀김옷과 두툼한 등심의 만남', tags: ['밀가루'] },
  { name: '초밥', emoji: '🍣', category: '일식', temperature: 'cold', spicy: false, style: 'meat', desc: '신선한 횟감과 알맞게 쥔 밥의 예술', tags: ['해산물'] },
  { name: '라멘', emoji: '🍜🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'noodle', desc: '진한 돈사골 육수와 부드러운 차슈의 조화', tags: ['밀가루'] },
  { name: '우동', emoji: '🍲🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'noodle', desc: '가쓰오부시 국물에 오동통한 면발이 맛있는 우동', tags: ['밀가루'] },
  { name: '메밀소바', emoji: '🧊🍜', category: '일식', temperature: 'cold', spicy: false, style: 'noodle', desc: '살얼음 둥둥 쯔유 소스에 적셔 먹는 시원한 소바', tags: [] },
  { name: '규동', emoji: '🍚🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'rice', desc: '달콤한 소스에 소고기와 양파를 졸여 올린 덮밥', tags: [] },
  { name: '텐동', emoji: '🍤🍚', category: '일식', temperature: 'hot', spicy: false, style: 'rice', desc: '바삭한 해산물/채소 튀김이 한가득 올라간 튀김덮밥', tags: ['밀가루', '해산물'] },
  { name: '회덮밥', emoji: '🐟🍚', category: '일식', temperature: 'cold', spicy: true, style: 'rice', desc: '신선한 활어회와 야채를 초고추장에 비벼먹는 밥', tags: ['해산물', '매운맛'] },
  { name: '일식 카레', emoji: '🍛🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'rice', desc: '오랜 시간 뭉근하게 끓여 부드럽고 진한 숙성 카레', tags: [] },
  { name: '야키소바', emoji: '🍝🇯🇵', category: '일식', temperature: 'hot', spicy: false, style: 'noodle', desc: '단짠 소스에 고기와 야채를 함께 볶아낸 면요리', tags: ['밀가루'] },
  { name: '타코야끼', emoji: '🐙🔴', category: '일식', temperature: 'hot', spicy: false, style: 'bread', desc: '깃쫄깃한 문어가 콕 박힌 오사카 정통 길거리 간식', tags: ['밀가루', '해산물'] },
  { name: '사시미', emoji: '🐟🥢', category: '일식', temperature: 'cold', spicy: false, style: 'meat', desc: '신선한 원어를 정성스레 썰어낸 극상의 깔끔함', tags: ['해산물'] },

  // --- 양식 및 기타 (12종) ---
  { name: '피자', emoji: '🍕', category: '양식', temperature: 'hot', spicy: false, style: 'bread', desc: '고소한 치즈가 듬뿍 토핑된 이탈리안 푸드', tags: ['밀가루'] },
  { name: '햄버거', emoji: '🍔', category: '양식', temperature: 'hot', spicy: false, style: 'bread', desc: '두툼한 수제 패티와 신선한 채소의 완벽 조합', tags: ['밀가루'] },
  { name: '파스타', emoji: '🍝', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '부드러운 크림 또는 상큼한 토마토 소스 면요리', tags: ['밀가루'] },
  { name: '스테이크', emoji: '🥩🍴', category: '양식', temperature: 'hot', spicy: false, style: 'meat', desc: '육즙을 꽉 잡아 입안에서 팡 튀는 그릴 스테이크', tags: [] },
  { name: '리조또', emoji: '🍚🇮🇹', category: '양식', temperature: 'hot', spicy: false, style: 'rice', desc: '크림 또는 토마토 소스에 부드럽게 익힌 이탈리안 쌀요리', tags: [] },
  { name: '연어 샐러드', emoji: '🥗🐟', category: '양식', temperature: 'cold', spicy: false, style: 'bread', desc: '신선한 연어와 채소, 새콤달콤 드레싱의 만남', tags: ['해산물'] },
  { name: '샌드위치', emoji: '🥪', category: '양식', temperature: 'cold', spicy: false, style: 'bread', desc: '가벼운 식사 대용으로 아주 깔끔하고 신선한 토스트', tags: ['밀가루'] },
  { name: '타코', emoji: '🌮', category: '양식', temperature: 'hot', spicy: true, style: 'bread', desc: '또띠아 위에 고기, 야채, 살사 소스를 듬뿍 올린 맥시칸 요리', tags: ['매운맛', '밀가루'] },
  { name: '쌀국수', emoji: '🍜🇻🇳', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '맑고 담백한 소고기 육수와 향긋한 베트남식 면', tags: [] },
  { name: '팟타이', emoji: '🍝🇹🇭', category: '양식', temperature: 'hot', spicy: false, style: 'noodle', desc: '새콤달콤한 소스에 새우와 두부를 볶아낸 태국식 볶음면', tags: ['해산물'] },
  { name: '똠양꿍', emoji: '🍲🌶️🇹🇭', category: '양식', temperature: 'hot', spicy: true, style: 'noodle', desc: '세계 3대 스프, 매콤새콤 신비로운 태국식 새우 스프', tags: ['매운맛', '해산물'] },
  { name: '나시고랭', emoji: '🍛🇮🇩', category: '양식', temperature: 'hot', spicy: false, style: 'rice', desc: '단짠 소스에 해산물을 넣고 고슬고슬 볶아낸 인도네시아 볶음밥', tags: ['해산물'] }
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
    text: '선호하는 음식의 장르를 선택해 주세요. (중복 선택 가능)',
    options: [
      { label: '🇰🇷 한식', value: '한식' },
      { label: '🇨🇳 중식', value: '중식' },
      { label: '🇯🇵 일식', value: '일식' },
      { label: '🇺🇸 양식/아시안', value: '양식' },
      { label: '🐣 상관없음', value: 'any' }
    ]
  },
  {
    id: 'temperature',
    text: '선호하는 음식의 온도를 선택해 주세요. (중복 선택 가능)',
    options: [
      { label: '🔥 따뜻한 음식', value: 'hot' },
      { label: '🧊 차가운 음식', value: 'cold' },
      { label: '🐣 상관없음', value: 'any' }
    ]
  },
  {
    id: 'spicy',
    text: '선호하는 음식의 맵기를 선택해 주세요. (중복 선택 가능)',
    options: [
      { label: '🌶️ 매콤 칼칼한 음식', value: true },
      { label: '🥬 담백 깔끔한 음식', value: false },
      { label: '🐣 상관없음', value: 'any' }
    ]
  },
  {
    id: 'style',
    text: '선호하는 음식의 종류를 선택해 주세요. (중복 선택 가능)',
    options: [
      { label: '🍚 든든한 밥', value: 'rice' },
      { label: '🍜 호로록 면', value: 'noodle' },
      { label: '🥩 두툼한 고기', value: 'meat' },
      { label: '🍕 빵/밀가루', value: 'bread' },
      { label: '🐣 상관없음', value: 'any' }
    ]
  }
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
  isLoggedIn: boolean;
  userProfile: any;
}

export default function RecommendScreen({ navigation, isLoggedIn, userProfile }: RecommendScreenProps) {
  const [gameState, setGameState] = useState<'intro' | 'questioning' | 'reveal'>('questioning');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [pool, setPool] = useState<MenuItem[]>(MENU_DATA);
  const [answers, setAnswers] = useState<Record<string, any[]>>({});
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]); // 현재 화면에서의 실시간 체크 항목 리스트

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

  const startQuiz = () => {
    setPool(MENU_DATA);
    setCurrentQIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setMatchingResults([]);
    setSelectedMenu(null);
    setRestaurantsList([]);
    setGameState('questioning');
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

  // 다중 선택지 토글 제어
  const handleToggleOption = (value: any) => {
    if (value === 'any') {
      // "상관없음" 선택 시 다른 것 전부 해제하고 "상관없음"만 체크
      setSelectedOptions(['any']);
    } else {
      // 다른 것 선택 시 "상관없음" 제거하고 토글링
      let newOptions = selectedOptions.filter(opt => opt !== 'any');
      if (newOptions.includes(value)) {
        newOptions = newOptions.filter(opt => opt !== value);
      } else {
        newOptions.push(value);
      }
      setSelectedOptions(newOptions);
    }
  };

  // 다음 질문으로 이동 처리 (지능형 다중 조건 OR 필터링)
  const handleNextStep = async () => {
    const currentQ = QUESTIONS[currentQIndex];
    // 아무것도 선택하지 않은 경우 자동으로 "any" (상관없음) 간주
    const finalSelection = selectedOptions.length === 0 ? ['any'] : selectedOptions;

    // 답변 목록에 적재
    const newAnswers = { ...answers, [currentQ.id]: finalSelection };
    setAnswers(newAnswers);

    // 필터링 처리 (다중 선택된 값 중 하나라도 부합되면 합격시키는 OR 매칭)
    let newPool = pool;
    if (!finalSelection.includes('any')) {
      if (currentQ.id === 'category') {
        newPool = pool.filter(item => finalSelection.includes(item.category));
      } else if (currentQ.id === 'temperature') {
        newPool = pool.filter(item => finalSelection.includes(item.temperature));
      } else if (currentQ.id === 'spicy') {
        newPool = pool.filter(item => finalSelection.includes(item.spicy));
      } else if (currentQ.id === 'style') {
        newPool = pool.filter(item => finalSelection.includes(item.style));
      }
    }

    // 최종 질문 완료 분기 처리
    if (currentQIndex + 1 >= QUESTIONS.length) {
      let finalPool = newPool.length > 0 ? newPool : (pool.length > 0 ? pool : MENU_DATA);

      // [기피 태그 적극 필터링 적용]
      try {
        const profileStr = await AsyncStorage.getItem('user_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          const avoidTags: string[] = profile.avoidTags ? profile.avoidTags.split(',').filter(Boolean) : [];
          
          if (avoidTags.length > 0) {
            console.log("🚫 Filtering out avoid tags:", avoidTags);
            const filteredPool = finalPool.filter(item => {
              // 아이템의 tags 배열이 사용자 기피 태그 중 하나라도 포함하는지 감시
              const hasAvoidTag = item.tags.some(tag => avoidTags.includes(tag));
              return !hasAvoidTag;
            });
            
            // 만약 너무 많은 기피 설정으로 결과가 전멸하면, 필터링 이전의 풀을 복구해 구출
            if (filteredPool.length > 0) {
              finalPool = filteredPool;
            }
          }
        }
      } catch (e) {
        console.log("Failed to apply avoid tags filtering", e);
      }

      setMatchingResults(finalPool);
      setGameState('reveal');
      onSelectMenu(finalPool[0]); // 첫 번째 매치 메뉴 자동 상세 로드
    } else {
      if (newPool.length > 0) {
        setPool(newPool);
      }
      setSelectedOptions([]); // 다음 단계를 위해 선택값 리셋
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  const onSelectMenu = async (menu: MenuItem) => {
    setSelectedMenu(menu);
    setLoadingRestaurants(true);
    setRestaurantsList([]);

    try {
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const lat = userCoords?.latitude || '37.497942';
      const lng = userCoords?.longitude || '127.0276197';
      const url = `http://${ip}:5000/api/restaurants?keyword=${encodeURIComponent(menu.name)}&x=${lng}&y=${lat}`;

      const response = await fetch(url);
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

  // 길찾기/지도클릭 시 백엔드 histories POST API 동기화 로그 기록 및 인앱 지도 이동
  const handleOpenMap = async (res: Restaurant) => {
    if (!selectedMenu) return;

    if (isLoggedIn) {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

        // Log eaten meal to backend histories
        console.log(`📅 Logging history: Eaten ${selectedMenu.name} at ${res.name}`);
        await fetch(`http://${ip}:5000/api/user/histories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            menuName: selectedMenu.name,
            emoji: selectedMenu.emoji,
            restaurantName: res.name,
            category: selectedMenu.category
          })
        });
      } catch (e) {
        console.log("Failed to sync eaten history to backend database", e);
      }
    } else {
      console.log(`📅 Skipping history log (Not logged in): Eaten ${selectedMenu.name} at ${res.name}`);
    }

    // 외부로 튕겨 나가지 않고, 인앱 지도 탭으로 네비게이션하며 좌표 매칭
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
        "최애 음식을 등록하고 나만의 맛집 리스트를 간직하려면 카카오로 3초 만에 로그인해 보세요!",
        [
          { text: "나중에" },
          { 
            text: "로그인하러 가기 ➔", 
            onPress: () => navigation.navigate("마이페이지") 
          }
        ]
      );
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

      console.log(`❤️ Toggling favorite for: ${selectedMenu.name}`);
      const res = await fetch(`http://${ip}:5000/api/user/favorites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menuName: selectedMenu.name,
          emoji: selectedMenu.emoji,
          category: selectedMenu.category
        })
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
            <Text style={styles.questionIcon}>🐣</Text>
            <Text style={styles.questionText}>{QUESTIONS[currentQIndex].text}</Text>
          </View>

          {/* Options List */}
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {QUESTIONS[currentQIndex].options.map((option, idx) => {
              // 체크박스 하이라이트 감지
              const isSelected = selectedOptions.includes(option.value);
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonActive
                  ]} 
                  onPress={() => handleToggleOption(option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelActive
                  ]}>{option.label}</Text>
                  <Text style={[
                    styles.checkText,
                    isSelected && styles.checkTextActive
                  ]}>
                    {isSelected ? '✓' : '○'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Next Button & Reset */}
          <View style={styles.buttonFooter}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
              <Text style={styles.nextButtonText}>다음 질문으로 ➔</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={startQuiz}>
              <Text style={styles.resetButtonText}>퀴즈 다시 풀기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {gameState === 'reveal' && (
        <ScrollView style={styles.scrollReveal} contentContainerStyle={styles.revealContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.revealTitle}>🐣 메추리의 맛있는 추천 결과!</Text>
          <Text style={styles.revealSubtitle}>중복 선택 조건을 감안해 꼬마 메추리가 골라온 추천 음식 리스트입니다.</Text>

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

          {/* 3. 동적 실서버 주변 맛집 출력부 */}
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
    backgroundColor: '#1c1917', // Warm Dark Stone
  },
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
    color: '#78716c',
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
    backgroundColor: '#fbbf24', // Gold fill
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.8)', // Warm stone
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)', // Gold border
    marginVertical: 14,
    alignItems: 'center',
  },
  questionIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  questionText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: '#fbbf24',
  },
  optionLabel: {
    color: '#a8a29e',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 10,
  },
  optionLabelActive: {
    color: '#fbbf24',
  },
  checkText: {
    color: '#44403c',
    fontSize: 15,
    fontWeight: 'bold',
  },
  checkTextActive: {
    color: '#fbbf24',
  },
  buttonFooter: {
    width: '100%',
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#fbbf24',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  nextButtonText: {
    color: '#1c1917',
    fontSize: 15,
    fontWeight: '800',
  },
  resetButton: {
    paddingVertical: 6,
  },
  resetButtonText: {
    color: '#78716c',
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
    color: '#a8a29e',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedDetailCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.8)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  heartBtn: {
    padding: 6,
  },
  detailCategory: {
    color: '#a8a29e',
    fontSize: 11,
    marginTop: 2,
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
    backgroundColor: 'rgba(41, 37, 36, 0.2)',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyContainer: {
    backgroundColor: 'rgba(41, 37, 36, 0.2)',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#78716c',
    fontSize: 13,
  },
  restaurantCard: {
    backgroundColor: 'rgba(41, 37, 36, 0.35)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
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
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  resMeta: {
    color: '#a8a29e',
    fontSize: 11,
    marginBottom: 2,
  },
  resAddress: {
    color: '#78716c',
    fontSize: 10,
  },
  navButton: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
  },
  navButtonText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  retryButton: {
    backgroundColor: 'rgba(41, 37, 36, 0.7)',
    borderRadius: 18,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.08)',
    marginTop: 10,
  },
  retryButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  }
});
