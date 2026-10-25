# Mechuri

메뉴 추천/월드컵/지도 기반 맛집 탐색 앱입니다.  
구성: `frontend`(Expo React Native) + `backend`(Express + Sequelize + MySQL)

## 설치

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

## 환경 변수

### backend (.env)

```env
PORT=5000
JWT_SECRET=replace_with_secure_random_secret

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=mechuri_db
DB_USER=postgres
DB_PASSWORD=mechuri_password

KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_REDIRECT_URI=http://localhost:5000/api/auth/kakao/callback
```

### frontend (.env)

```env
EXPO_PUBLIC_KAKAO_CLIENT_ID=your_kakao_rest_api_key
EXPO_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:5000/api/auth/kakao/callback
```

## 실행

```bash
# backend
npm run start --prefix backend

# frontend
npm run start --prefix frontend
```