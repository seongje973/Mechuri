// 게스트가 기기에 쌓은 기록을 로그인한 계정으로 옮길 때 쓰는 순수 함수들 (POST /api/user/import)

const MAX_HISTORIES = 200;
const MAX_FAVORITES = 200;
const MAX_AVOID_TAGS = 20;
const MAX_TEXT = 100;

const { PreferencesError, normalizePreferences } = require('./preferences');

class ImportError extends Error {}

const text = (value, max = MAX_TEXT) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
};

const listOf = (value, name, max) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ImportError(`${name} must be an array.`);
  if (value.length > max) throw new ImportError(`${name} can have at most ${max} items.`);
  return value;
};

/** 쉼표 문자열이나 배열을 받아 공백·중복을 뺀 태그 배열로 */
const parseTags = value => {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(list.map(t => text(t, 20)).filter(Boolean))];
};

/** 잘못된 시각이나 미래 시각은 지금으로 */
const toDate = (value, now) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) && d.getTime() <= now.getTime() ? d : now;
};

/** 요청 본문을 검사하고 저장할 모양으로 정리한다. 잘못되면 ImportError */
const normalizeImportPayload = (body, now = new Date()) => {
  if (!body || typeof body !== 'object') throw new ImportError('Request body is required.');

  const histories = listOf(body.histories, 'histories', MAX_HISTORIES)
    .map(h => ({
      menuName: text(h && h.menuName),
      emoji: text(h && h.emoji, 16),
      restaurantName: text(h && h.restaurantName),
      category: text(h && h.category, 20),
      createdAt: toDate(h && h.createdAt, now)
    }))
    .filter(h => h.menuName);

  const favorites = listOf(body.favorites, 'favorites', MAX_FAVORITES)
    .map(f => ({
      menuName: text(f && f.menuName),
      emoji: text(f && f.emoji, 16),
      category: text(f && f.category, 20),
      createdAt: toDate(f && f.createdAt, now)
    }))
    .filter(f => f.menuName);

  const avoidTags = parseTags(body.avoidTags);
  if (avoidTags.length > MAX_AVOID_TAGS) throw new ImportError(`avoidTags can have at most ${MAX_AVOID_TAGS} items.`);

  let preferences = null;
  if (body.preferences !== undefined && body.preferences !== null) {
    try {
      preferences = normalizePreferences(body.preferences);
    } catch (error) {
      if (error instanceof PreferencesError) throw new ImportError(error.message);
      throw error;
    }
  }

  return { histories, favorites, avoidTags, preferences };
};

const historyKey = h => `${h.menuName}@${new Date(h.createdAt).getTime()}`;

/**
 * 이미 계정에 있는 것과 합친다.
 * - 즐겨찾기: 같은 메뉴는 하나만 (중복 메뉴 합치기)
 * - 식사 기록: 같은 메뉴·같은 시각이면 같은 기록으로 본다. 이관 응답을 못 받아 다시 보내도 두 번 저장되지 않는다
 * - 기피 태그: 합집합
 * - 취향 설정: 계정에 이미 있으면 계정 것을 두고, 없을 때만 게스트 것을 쓴다
 */
const planImport = (payload, existing) => {
  const seenHistories = new Set((existing.histories || []).map(historyKey));
  const histories = [];
  for (const h of payload.histories) {
    const key = historyKey(h);
    if (seenHistories.has(key)) continue;
    seenHistories.add(key);
    histories.push(h);
  }

  const seenFavorites = new Set((existing.favorites || []).map(f => f.menuName));
  const favorites = [];
  for (const f of payload.favorites) {
    if (seenFavorites.has(f.menuName)) continue;
    seenFavorites.add(f.menuName);
    favorites.push(f);
  }

  const avoidTags = parseTags([...parseTags(existing.avoidTags), ...payload.avoidTags]).join(',');
  const preferences = existing.preferences || payload.preferences || null;
  return { histories, favorites, avoidTags, preferences };
};

module.exports = {
  ImportError,
  normalizeImportPayload,
  planImport,
  parseTags,
  MAX_HISTORIES,
  MAX_FAVORITES,
  MAX_AVOID_TAGS
};
