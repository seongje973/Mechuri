const express = require('express');
const jwt = require('jsonwebtoken');

// 지표용 이벤트 수집 (US-23). 게스트도 쓰므로 로그인 없이 기기 ID로 받는다.
const EVENT_TYPES = ['rec_start', 'question_answer', 'result_shown', 'accept', 'reject'];
const ANSWERS = ['yes', 'probably', 'dontcare', 'no'];
const ACCEPT_ACTIONS = ['restaurant', 'delivery', 'eat', 'favorite'];

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_BATCH = 50;
const MAX_PAYLOAD_CHARS = 2000;
const MAX_FUTURE_MS = 5 * 60 * 1000;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 100;

const PAYLOAD_RULES = {
  rec_start: () => null,
  question_answer: (p) => {
    if (!isNonEmptyString(p.questionId)) return 'payload.questionId is required.';
    if (!ANSWERS.includes(p.answer)) return `payload.answer must be one of ${ANSWERS.join(', ')}.`;
    return null;
  },
  result_shown: (p) => (isNonEmptyString(p.menu) ? null : 'payload.menu is required.'),
  accept: (p) => {
    if (!ACCEPT_ACTIONS.includes(p.action)) return `payload.action must be one of ${ACCEPT_ACTIONS.join(', ')}.`;
    if (!isNonEmptyString(p.menu)) return 'payload.menu is required.';
    return null;
  },
  reject: (p) => (isNonEmptyString(p.menu) ? null : 'payload.menu is required.')
};

// 앱 시각이 없거나 이상하면(미래) 서버 시각을 쓴다
const resolveOccurredAt = (value, now) => {
  if (value === undefined || value === null) return now;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > now.getTime() + MAX_FUTURE_MS) return now;
  return date;
};

/**
 * 요청 본문의 이벤트 하나를 검사해 저장할 행으로 바꾼다.
 * 반환: { row } 또는 { error }
 */
const normalizeEvent = (raw, { deviceId: defaultDeviceId, userId = null, now = new Date() } = {}) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Event must be an object.' };

  const { type, sessionId, occurredAt } = raw;
  const deviceId = raw.deviceId ?? defaultDeviceId;
  const payload = raw.payload ?? {};

  if (!EVENT_TYPES.includes(type)) return { error: `type must be one of ${EVENT_TYPES.join(', ')}.` };
  if (typeof sessionId !== 'string' || !ID_PATTERN.test(sessionId)) return { error: 'sessionId is invalid.' };
  if (typeof deviceId !== 'string' || !ID_PATTERN.test(deviceId)) return { error: 'deviceId is invalid.' };
  if (typeof payload !== 'object' || Array.isArray(payload)) return { error: 'payload must be an object.' };
  if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) return { error: 'payload is too large.' };

  const payloadError = PAYLOAD_RULES[type](payload);
  if (payloadError) return { error: payloadError };

  return {
    row: { type, sessionId, deviceId, userId, payload, occurredAt: resolveOccurredAt(occurredAt, now) }
  };
};

// 토큰이 있으면 사용자에 묶고, 없거나 만료됐으면 게스트로 기록한다 (지표는 버리지 않는다)
const readOptionalUserId = (req, jwtSecret) => {
  const authHeader = req.headers.authorization;
  if (!jwtSecret || !authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], jwtSecret);
    return Number.isInteger(decoded.id) ? decoded.id : null;
  } catch (error) {
    return null;
  }
};

/**
 * POST /  본문은 이벤트 하나 또는 { deviceId, events: [...] } 묶음 (최대 50개).
 * 하나라도 잘못되면 아무것도 저장하지 않는다.
 */
const createEventsRouter = ({ Event = require('../models/Event'), jwtSecret = process.env.JWT_SECRET } = {}) => {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const body = req.body || {};
    const isBatch = Array.isArray(body.events);
    const rawEvents = isBatch ? body.events : [body];

    if (rawEvents.length === 0 || rawEvents.length > MAX_BATCH) {
      return res.status(400).json({ error: `events must contain 1 to ${MAX_BATCH} items.` });
    }

    const context = { deviceId: body.deviceId, userId: readOptionalUserId(req, jwtSecret), now: new Date() };
    const rows = [];
    for (let i = 0; i < rawEvents.length; i += 1) {
      const { row, error } = normalizeEvent(rawEvents[i], context);
      if (error) {
        return res.status(400).json({ error: isBatch ? `events[${i}]: ${error}` : error });
      }
      rows.push(row);
    }

    try {
      try {
        await Event.bulkCreate(rows);
      } catch (error) {
        // 토큰은 유효한데 계정이 지워진 경우: 게스트 기록으로 남긴다
        if (error.name !== 'SequelizeForeignKeyConstraintError' || context.userId === null) throw error;
        await Event.bulkCreate(rows.map((row) => ({ ...row, userId: null })));
      }
      return res.status(201).json({ saved: rows.length });
    } catch (error) {
      console.error('❌ Event Save Error:', error.message);
      return res.status(500).json({ error: 'Failed to save events.' });
    }
  });

  return router;
};

module.exports = { createEventsRouter, normalizeEvent, EVENT_TYPES, ANSWERS, ACCEPT_ACTIONS, MAX_BATCH };
