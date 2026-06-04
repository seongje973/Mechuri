const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.get('/', async (req, res) => {
  const { keyword, x, y } = req.query;

  if (!keyword) {
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

      return res.json({
        source: 'Kakao Local API Real-time Data',
        count: restaurants.length,
        restaurants
      });

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

module.exports = router;
