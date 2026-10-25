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
  // .env.example 의 자리표시자를 그대로 복사한 경우도 키가 없는 것으로 본다
  const isDefaultKey = !apiKey || ['your_kakao_api_key_here', 'your_kakao_rest_api_key'].includes(apiKey);

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
      
      // 우리 앱에 맞춘 데이터 구조. 카카오 로컬 검색에는 평점이 없으므로 평점은 싣지 않는다.
      const restaurants = documents.map((doc) => ({
        name: doc.place_name,
        distance: `${doc.distance}m`,
        category: doc.category_name.split(' > ').pop() || '음식점',
        url: doc.place_url, // 실제 카카오맵 플레이스 주소
        address: doc.road_address_name || doc.address_name,
        latitude: parseFloat(doc.y),
        longitude: parseFloat(doc.x)
      }));

      const body = {
        source: 'Kakao Local API Real-time Data',
        count: restaurants.length,
        restaurants
      };
      writeCache(cacheKey, body);
      return res.json(body);

    } catch (error) {
      console.error('❌ Kakao API Request Error:', error.message);
      return res.status(502).json({
        error: 'restaurant_search_failed',
        message: '식당 검색 서비스에 연결하지 못했어요.'
      });
    }
  }

  // 2. 키가 없을 때: 지어낸 식당을 실제처럼 보여주지 않는다.
  // 개발 중 화면 확인용 샘플은 RESTAURANT_MOCK=true 일 때만, 샘플임을 표시해서 준다 (운영에서는 꺼짐).
  const mockEnabled = process.env.RESTAURANT_MOCK === 'true' && process.env.NODE_ENV !== 'production';
  if (!mockEnabled) {
    return res.status(503).json({
      error: 'restaurant_search_unavailable',
      message: '식당 검색이 설정되지 않았어요. (KAKAO_REST_API_KEY 없음)'
    });
  }

  const centerLat = parseFloat(currentLat);
  const centerLng = parseFloat(currentLng);
  // 위도 0.001도 = 약 110m, 경도 0.001도 = 약 88m
  const offsets = [[0.0015, -0.0012], [-0.0021, 0.0018], [0.0032, 0.0028]];
  const sampleRestaurants = offsets.map(([dLat, dLng], idx) => ({
    name: `[샘플] ${keyword} 식당 ${idx + 1}`,
    category: '샘플 데이터',
    url: `https://map.kakao.com/?q=${encodeURIComponent(keyword)}`,
    address: '개발용 샘플 (실제 식당 아님)',
    latitude: centerLat + dLat,
    longitude: centerLng + dLng
  }));

  return res.json({
    source: 'Development sample data (RESTAURANT_MOCK=true)',
    mock: true,
    count: sampleRestaurants.length,
    restaurants: sampleRestaurants
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
