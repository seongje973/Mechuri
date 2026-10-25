const express = require('express');

// 추천 상황 보정용 현재 날씨 (L-02). Open-Meteo는 API 키가 필요 없다.
// 앱은 이 서버만 부르므로 나중에 날씨 API를 바꿔도 앱은 그대로 둔다.
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 500;
const TIMEOUT_MS = 4000;

// WMO weather code → 앱에서 쓰는 4가지
const toCondition = (code) => {
  if (!Number.isFinite(code)) return 'unknown';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  if (code <= 1) return 'clear';
  return 'cloudy';
};

const parseCoord = (value, limit) => {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
};

const createWeatherRouter = ({ fetchImpl = (...args) => fetch(...args), now = () => Date.now() } = {}) => {
  const router = express.Router();
  const cache = new Map();

  router.get('/', async (req, res) => {
    const lat = parseCoord(req.query.lat, 90);
    const lng = parseCoord(req.query.lng, 180);
    if (lat === null || lng === null) {
      return res.status(400).json({ error: 'lat and lng are required.' });
    }

    // 약 1km 단위로 묶어서 캐시
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const hit = cache.get(key);
    if (hit && now() - hit.at < CACHE_TTL_MS) {
      return res.json({ ...hit.data, cached: true });
    }

    const url = `${OPEN_METEO_URL}?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`open-meteo ${response.status}`);
      const body = await response.json();
      const temperature = Number(body?.current?.temperature_2m);
      const data = {
        condition: toCondition(Number(body?.current?.weather_code)),
        temperature: Number.isFinite(temperature) ? temperature : null
      };
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, { at: now(), data });
      return res.json({ ...data, cached: false });
    } catch (error) {
      // 날씨는 있으면 좋은 정보라 실패해도 추천은 계속된다. 앱은 503을 받으면 날씨 보정을 건너뛴다
      console.error('⚠️ Weather fetch failed:', error.message);
      return res.status(503).json({ error: 'Weather unavailable.' });
    } finally {
      clearTimeout(timer);
    }
  });

  return router;
};

module.exports = { createWeatherRouter, toCondition, CACHE_TTL_MS };
