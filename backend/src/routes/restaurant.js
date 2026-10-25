const express = require('express');
const router = express.Router();
const axios = require('axios');
const { sequelize } = require('../config/db');
const History = require('../models/History');
require('dotenv').config();

// 같은 자리에서 같은 메뉴를 다시 찾을 때 카카오 API를 또 부르지 않도록 10분간 결과를 기억한다.
// 좌표는 소수점 셋째 자리(약 100m)로 반올림해 키를 만든다. 서버 한 대 기준의 메모리 캐시다.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const restaurantCache = new Map();

const buildCacheKey = (keyword, lng, lat) =>
  `${Number(lng).toFixed(3)},${Number(lat).toFixed(3)}|${keyword.trim()}`;

const readCache = (key) => {
  const entry = restaurantCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    restaurantCache.delete(key);
    return null;
  }
  return entry.body;
};

const writeCache = (key, body) => {
  // Map은 넣은 순서를 지키므로 맨 앞이 가장 오래된 항목이다
  if (restaurantCache.size >= CACHE_MAX_ENTRIES) {
    restaurantCache.delete(restaurantCache.keys().next().value);
  }
  restaurantCache.set(key, { storedAt: Date.now(), body });
};

router.get('/', async (req, res) => {
  const { keyword, x, y } = req.query;

  // ?keyword=a&keyword=b 처럼 배열로 오면 거절한다
  if (typeof keyword !== 'string' || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword query parameter is required.' });
  }

  // 기본 강남역 위경도 값 설정
  const defaultLng = '127.0276197';
  const defaultLat = '37.497942';
  const currentLng = x || defaultLng;
  const currentLat = y || defaultLat;

  const apiKey = process.env.KAKAO_REST_API_KEY;
  const isDefaultKey = !apiKey || apiKey === 'your_kakao_api_key_here';

  // 1. 카카오 API 키가 정상적으로 설정되어 있는 경우
  if (!isDefaultKey) {
    const cacheKey = buildCacheKey(keyword, currentLng, currentLat);
    const cached = readCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    try {
      console.log(`🌐 Calling Kakao Local API for keyword: "${keyword}" at coordinates (${currentLng}, ${currentLat})`);
      
      const response = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
        headers: {
          Authorization: `KakaoAK ${apiKey}`
        },
        params: {
          query: keyword,
          x: currentLng,
          y: currentLat,
          category_group_code: 'FD6', // 음식점만
          radius: 1500,          // 반경 1.5km 이내 검색
          sort: 'distance'       // 거리순 정렬
        }
      });

      const documents = response.data.documents || [];
      
      // 우리 앱에 맞춘 데이터 구조 포맷팅 (위경도 좌표 데이터 추가)
      const restaurants = documents.map((doc, idx) => {
        const mockRating = (4.3 + (doc.place_name.length % 7) * 0.1).toFixed(1);
        
        return {
          name: doc.place_name,
          rating: `⭐ ${mockRating}`,
          distance: `${doc.distance}m`,
          category: doc.category_name.split(' > ').pop() || '음식점',
          url: doc.place_url, // 실제 카카오맵 플레이스 주소
          address: doc.road_address_name || doc.address_name,
          latitude: parseFloat(doc.y),  // 위도 추가
          longitude: parseFloat(doc.x), // 경도 추가
          type: idx === 0 ? '추천 일등' : idx === 1 ? '인기 매장' : '주변 맛집'
        };
      });

      const body = {
        source: 'Kakao Local API Real-time Data',
        count: restaurants.length,
        restaurants
      };
      writeCache(cacheKey, body);
      return res.json(body);

    } catch (error) {
      console.error('❌ Kakao API Request Error:', error.message);
    }
  }

  // 2. API 키가 없거나 에러가 났을 때의 폴백 (가상 식당 데이터 동적 생성, 위경도도 오프셋으로 정교하게 생성)
  console.log(`⚠️ Kakao API Key is missing or invalid. Generating high-fidelity mock restaurants for "${keyword}"`);
  
  const centerLat = parseFloat(currentLat);
  const centerLng = parseFloat(currentLng);

  let areaName = '근처';
  if (centerLat > 37.55 && centerLng > 126.9) areaName = '신촌마포점';
  else if (centerLat > 37.5 && centerLat < 37.53 && centerLng > 127.0) areaName = '강남역점';
  else if (centerLat > 37.56 && centerLng > 127.03) areaName = '왕십리본점';
  else areaName = '역삼점';

  // 위도 0.001도 = 약 110m, 경도 0.001도 = 약 88m
  const mockRestaurants = [
    { 
      name: `대박 소문난 ${keyword} ${areaName}`, 
      rating: '⭐ 4.9', 
      distance: '180m', 
      category: '한식/요리', 
      url: `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(keyword)}`, 
      address: `서울시 강남구 테헤란로 ${keyword} 골목`,
      latitude: centerLat + 0.0015,
      longitude: centerLng - 0.0012,
      type: '지역 최애' 
    },
    { 
      name: `대대손손 3대 전통 ${keyword}`, 
      rating: '⭐ 4.7', 
      distance: '380m', 
      category: '전문 음식점', 
      url: `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(keyword)}`, 
      address: `서울시 강남구 논현로 ${keyword} 전문로`,
      latitude: centerLat - 0.0021,
      longitude: centerLng + 0.0018,
      type: '리뷰 천개' 
    },
    { 
      name: `엄마 손맛 ${keyword} 푸드하우스`, 
      rating: '⭐ 4.5', 
      distance: '620m', 
      category: '가정식', 
      url: `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(keyword)}`, 
      address: `서울시 강남구 역삼로 ${keyword} 가든`,
      latitude: centerLat + 0.0032,
      longitude: centerLng + 0.0028,
      type: '가성비 최고' 
    }
  ];

  return res.json({
    source: 'MeChuri Simulator Mock Data (Kakao API Key is not set)',
    count: mockRestaurants.length,
    restaurants: mockRestaurants
  });
});

// 실시간 인기 메뉴 TOP 5 통계 API
router.get('/ranking', async (req, res) => {
  try {
    const ranking = await History.findAll({
      attributes: [
        'menuName',
        'emoji',
        'category',
        [sequelize.fn('COUNT', sequelize.col('menuName')), 'count']
      ],
      group: ['menuName', 'emoji', 'category'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 5
    });
    
    // Sequelize 결과 포맷 정제
    const formattedRanking = ranking.map((item, idx) => {
      const data = item.get({ plain: true });
      return {
        rank: idx + 1,
        menuName: data.menuName,
        emoji: data.emoji,
        category: data.category,
        count: parseInt(data.count, 10) || 0
      };
    });

    // 만약 데이터베이스에 쌓인 히스토리가 하나도 없다면 폴백 데이터 노출
    if (formattedRanking.length === 0) {
      throw new Error('No history logs in Database yet.');
    }

    return res.json({
      success: true,
      source: 'Database Live Statistics',
      ranking: formattedRanking
    });
  } catch (error) {
    console.log('⚠️ Ranking API Fallback Triggered:', error.message);
    
    // DB 데이터가 없거나 서버 에러 시 폴백용 고품질 트렌드 데이터 전송
    const fallbackRanking = [
      { rank: 1, menuName: '삼겹살', emoji: '🥩', category: '한식', count: 18 },
      { rank: 2, menuName: '짜장면', emoji: '🍜', category: '중식', count: 14 },
      { rank: 3, menuName: '돈까스', emoji: '🍛', category: '일식', count: 11 },
      { rank: 4, menuName: '초밥', emoji: '🍣', category: '일식', count: 9 },
      { rank: 5, menuName: '피자', emoji: '🍕', category: '양식', count: 6 }
    ];

    return res.json({
      success: true,
      source: 'Mock Fallback Data',
      ranking: fallbackRanking
    });
  }
});

module.exports = router;
module.exports.CACHE_TTL_MS = CACHE_TTL_MS;
module.exports.buildCacheKey = buildCacheKey;
module.exports.clearRestaurantCache = () => restaurantCache.clear();
