# Mechuri (메추리)

질문 몇 개에 답하면 오늘 먹을 메뉴를 골라 주는 "메뉴 아키네이터" 앱입니다.
구성: `frontend` (Expo React Native) + `backend` (Express + Sequelize + PostgreSQL)

## 준비물

- Node.js 20 이상
- Docker (PostgreSQL을 띄울 때)
- 휴대폰에 Expo Go 앱 (실기기 테스트)

## 처음 한 번만

```bash
# 1. 패키지 설치
npm install
npm install --prefix backend
npm install --prefix frontend

# 2. 환경 변수 파일 만들기
cp backend/.env.example backend/.env      # JWT_SECRET, 카카오 키 채우기
cp frontend/.env.example frontend/.env    # 카카오 키 채우기

# 3. DB 띄우기 (PostgreSQL 15, 기본 계정은 backend/.env.example 과 같음)
docker compose -f backend/docker-compose.yml up -d
```

서버를 처음 켜면 Sequelize가 테이블을 자동으로 만듭니다 (`NODE_ENV`가 `production`이 아니면 `sync({ alter: true })`).

## 실행

```bash
npm run dev          # 서버(nodemon) + Expo 를 함께 실행
# 또는 따로
npm run backend
npm run frontend
```

Expo 화면의 QR 코드를 폰의 Expo Go로 찍으면 됩니다.

### 서버 주소

앱은 서버 주소를 `frontend/src/api/client.ts` 한 곳에서 정합니다.

1. `frontend/.env`의 `EXPO_PUBLIC_API_URL`이 있으면 그 값
2. 없으면 Expo 개발 서버가 돌고 있는 PC의 IP + `:5000` (PC와 폰이 같은 와이파이면 실기기도 동작)
3. 그것도 없으면 에뮬레이터 기본값 (Android `10.0.2.2`, iOS `localhost`)

폰이 서버에 못 닿으면 PC 방화벽에서 5000번 포트를 열거나, 터널을 쓸 때는 `EXPO_PUBLIC_API_URL`을 직접 넣으세요.
화면 코드에서는 `fetch` 대신 `apiFetch('/api/...')`를 쓰면 서버 주소와 로그인 토큰이 자동으로 붙습니다.

## 테스트

```bash
npm test --prefix frontend           # 추천 엔진, API 클라이언트 테스트 (jest-expo)
npm run typecheck --prefix frontend  # 타입 검사
```

## 폴더

```
frontend/src/api/        서버 호출(apiFetch), 로그인 세션 저장
frontend/src/engine/     추천 로직 (화면과 분리된 순수 함수)
frontend/src/constants/  메뉴 데이터, 질문
frontend/src/screens/    화면
backend/src/routes/      auth, user, restaurants API
docs/                    메뉴 속성 기준표 등 문서
```

## 로그인

- 로그인하지 않아도 추천, 월드컵, 지도를 쓸 수 있습니다. 즐겨찾기·기록 저장은 로그인 후 서버에 저장됩니다.
- 카카오 로그인은 카카오 개발자 콘솔에 Redirect URI(`KAKAO_REDIRECT_URI`)를 등록해야 동작합니다.
- 마이페이지의 "간편 동기화"는 개발용 단축 로그인입니다. 개발 빌드에서만 보이고, 서버도 `NODE_ENV=production`이면 막습니다.
