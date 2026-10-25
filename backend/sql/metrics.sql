-- Mechuri 성공 지표 4개 (기획서 "현재 프로토타입 진단, 지표, 리스크")
-- 이벤트는 POST /api/events 로 쌓인 "Events" 테이블 (backend/src/models/Event.js)
--
-- 실행: psql "$DATABASE_URL" -v from="'2026-12-14'" -v to="'2026-12-21'" -f backend/sql/metrics.sql
--   from/to 는 occurredAt 기준 [from, to) 기간. 빼면 전체 기간.
--
-- 용어
--   추천 = 같은 sessionId 로 묶인 한 번의 추천 (rec_start 부터)
--   사용자 = 로그인했으면 userId, 아니면 deviceId
--   결과를 본 추천 = result_shown 이 1번 이상 있는 추천

\if :{?from}
\else
  \set from '''-infinity'''
\endif
\if :{?to}
\else
  \set to '''infinity'''
\endif

SET client_min_messages = warning;

DROP TABLE IF EXISTS metric_events;
CREATE TEMP TABLE metric_events AS
SELECT *, COALESCE("userId"::text, 'device:' || "deviceId") AS actor
FROM "Events"
WHERE "occurredAt" >= :from::timestamptz AND "occurredAt" < :to::timestamptz;

-- 같은 시각에 묶여 온 이벤트는 id(저장 순서)로 순서를 정한다
DROP TABLE IF EXISTS metric_sessions;
CREATE TEMP TABLE metric_sessions AS
SELECT
  e."sessionId",
  r."occurredAt" AS first_result_at,
  r.id AS first_result_id,
  BOOL_OR(e.type = 'accept') AS accepted,
  BOOL_OR(e.type = 'reject') AS rejected
FROM metric_events e
LEFT JOIN LATERAL (
  SELECT "occurredAt", id
  FROM metric_events r
  WHERE r."sessionId" = e."sessionId" AND r.type = 'result_shown'
  ORDER BY "occurredAt", id
  LIMIT 1
) r ON true
GROUP BY e."sessionId", r."occurredAt", r.id;

-- 1. 추천 수락률: 결과를 본 추천 중 식당 보기·배달·먹을래요·하트를 1번 이상 누른 비율 (목표 50% 이상)
-- 2. 결정까지 질문 수: 첫 결과가 나오기 전까지 답한 질문 수의 평균 (목표 6개 이하)
--    "틀렸어요" 뒤에 이어 답한 질문은 세지 않는다
-- 3. "틀렸어요" 비율: 결과를 본 추천 중 "틀렸어요"를 1번 이상 누른 비율 (목표 30% 이하)
SELECT
  COUNT(*) AS sessions_with_result,
  ROUND(100.0 * COUNT(*) FILTER (WHERE s.accepted) / NULLIF(COUNT(*), 0), 1) AS acceptance_rate_pct,
  ROUND(AVG(q.questions_before_result), 2) AS avg_questions_to_result,
  ROUND(100.0 * COUNT(*) FILTER (WHERE s.rejected) / NULLIF(COUNT(*), 0), 1) AS reject_rate_pct
FROM metric_sessions s
CROSS JOIN LATERAL (
  SELECT COUNT(*) AS questions_before_result
  FROM metric_events e
  WHERE e."sessionId" = s."sessionId"
    AND e.type = 'question_answer'
    AND (e."occurredAt", e.id) < (s.first_result_at, s.first_result_id)
) q
WHERE s.first_result_at IS NOT NULL;

-- 4. 주간 재방문: 주마다 추천을 시작한 사용자 중 그 주에 2번 이상 시작한 비율 (목표 30% 이상)
--    주는 월요일 시작 (date_trunc 'week')
SELECT
  week_start::date AS week_start,
  COUNT(*) AS active_users,
  COUNT(*) FILTER (WHERE starts >= 2) AS returning_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE starts >= 2) / COUNT(*), 1) AS weekly_return_pct
FROM (
  SELECT date_trunc('week', "occurredAt") AS week_start, actor, COUNT(DISTINCT "sessionId") AS starts
  FROM metric_events
  WHERE type = 'rec_start'
  GROUP BY 1, 2
) per_user
GROUP BY week_start
ORDER BY week_start;

-- 튜닝용 (US-33): "틀렸어요"를 많이 받은 메뉴
SELECT payload->>'menu' AS menu, COUNT(*) AS rejects
FROM metric_events
WHERE type = 'reject'
GROUP BY 1
ORDER BY rejects DESC, menu
LIMIT 20;
