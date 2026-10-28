# CLAUDE.md

이 저장소에서 작업하는 Claude(와 사람)를 위한 안내입니다. 설치·실행의 자세한 설명은 `README.md`, 배포는 `docs/deploy.md`를 봅니다.

## 프로젝트

Mechuri(메추리, "메뉴 추천 리스트")는 질문 몇 개에 답하면 오늘 먹을 메뉴를 골라 주는 "메뉴 아키네이터" 앱입니다. 마스코트는 탐정 메추리 "추리"입니다.

- `frontend/`: Expo SDK 54, React Native 0.81, React 19.1, TypeScript
- `backend/`: Node 20+, Express, Sequelize, PostgreSQL, Socket.IO(같이 정하기 방)
- 루트 `package.json`: `concurrently`로 둘을 함께 띄우는 스크립트만 있습니다.

## 폴더

```
frontend/App.tsx              글꼴 로드(useFonts), SafeAreaProvider, NavigationContainer
frontend/src/api/             서버 호출(apiFetch), 로그인 세션, 카카오 로그인, 방 소켓
frontend/src/engine/          추천 로직. 화면과 분리된 순수 함수 (점수, 개인화, 그룹 점수, 식사 리포트)
frontend/src/constants/       메뉴 데이터(menuData), 질문(akinatorQuestions)
frontend/src/screens/         탭 화면 (홈·추천·같이·지도·내정보, 월드컵은 숨은 탭), group/ 하위 화면
frontend/src/components/      공용 컴포넌트 (LoginSheet, TasteSheet, MiniWorldCup, QuailBadge)
frontend/src/storage/         게스트/로그인 사용자 데이터 저장 (userData)
frontend/src/analytics/       이벤트 수집 (track, flushEvents)
frontend/src/theme/           디자인 토큰 (colors, typography, spacing)
backend/src/routes/           auth, user, restaurants, events, rooms, weather API
backend/src/models/           Sequelize 모델
backend/src/realtime/         같이 정하기 방 (메모리 RoomSession + DB 저장)
backend/migrations/           sequelize-cli 마이그레이션
docs/                         메뉴 속성 기준표, 디자인 토큰, 배포, 개인정보처리방침
```

## 실행과 테스트

```bash
npm install && npm install --prefix backend && npm install --prefix frontend
docker compose -f backend/docker-compose.yml up -d   # 로컬 PostgreSQL
npm run dev                                          # 서버(nodemon) + Expo

npm test --prefix frontend            # jest-expo
npm run typecheck --prefix frontend   # tsc --noEmit
npm run check:menu --prefix frontend  # 메뉴 데이터 점검
npm test --prefix backend             # node --test
# 마이그레이션까지 확인 (DB 이름에 test가 들어가야 하고, 그 DB의 public 스키마를 지웁니다)
TEST_DATABASE_URL=postgres://postgres:mechuri_password@127.0.0.1:5432/mechuri_test npm test --prefix backend
```

PR을 올리기 전에 프론트 테스트, 타입 검사, 백엔드 테스트를 모두 통과시킵니다.

## 프론트엔드 규칙

- **테마 토큰**: 색·글꼴·간격은 항상 `src/theme`에서 가져옵니다 (`import { colors, fonts, typography, spacing, radii } from '../theme'`). 화면 파일 안에 따로 팔레트나 색 상수를 만들지 않습니다.
- **테마색**: 앱 전체 테마색은 `src/theme/colors.ts`의 `BRAND` 한 줄로 정합니다 (기본 `tomato`, 후보는 `brandThemes`). 코드에서는 `colors.brand`, `brandDeep`, `brandSoft`, `brandText`, `onBrand`만 쓰고 hex를 직접 적지 않습니다. 새 후보를 넣을 때는 `brand`가 흰 글자(`onBrand`)와 4.5:1 이상 대비가 나야 합니다.
- **글꼴**: 글꼴은 Noto Sans KR 하나이고 굵기마다 이름이 다릅니다. 굵기는 `fontWeight`가 아니라 `fontFamily`로 정합니다 (`fonts.display`/`heavy`/`bold`/`medium`/`body`, 또는 `typography.*`). 안드로이드는 커스텀 글꼴에서 `fontWeight`를 무시합니다. 이모지만 있는 텍스트에는 `fontFamily`를 넣지 않습니다.
- **SafeAreaView**: `react-native`가 아니라 `react-native-safe-area-context`의 `SafeAreaView`를 쓰고, 탭 화면은 `edges={['top']}`을 줍니다. RN 기본 `SafeAreaView`는 iOS 전용이고 SDK 54 안드로이드는 edge-to-edge입니다.
- **서버 호출**: `fetch` 대신 `apiFetch('/api/...')`(`src/api/client.ts`)를 씁니다. 서버 주소와 로그인 토큰이 자동으로 붙습니다.
- **추천 로직**은 `src/engine/`의 순수 함수로 두고 테스트를 함께 씁니다. 화면에는 상태와 표시만 둡니다.
- 백엔드 `realtime/questionOrder.js`의 질문 id는 `constants/akinatorQuestions.ts`와 같아야 합니다 (테스트가 확인합니다).
- 화면 테스트는 `require('react-test-renderer')`를 씁니다. `react-test-renderer`는 `react`와 같은 정확한 버전(19.1.0)으로 고정합니다. 범위로 바꾸면 npm ERESOLVE가 납니다.
- 다크 모드 값(`darkColors`)은 정의만 되어 있고 앱은 아직 라이트만 씁니다.

## 백엔드 규칙

- **마이그레이션**: 모델(`src/models/`)을 추가하거나 컬럼을 바꾸면 같은 PR에 `backend/migrations/` 마이그레이션을 꼭 넣습니다 (`npm run db:migration:new -- <이름>`). 운영(`NODE_ENV=production`)은 `sync`를 하지 않고 마이그레이션만 적용합니다. `TEST_DATABASE_URL`로 테스트를 돌리면 모델과 마이그레이션이 어긋날 때 실패합니다.
- 회원 탈퇴(`src/user/deleteAccount.js`)는 계정에 묶인 기록을 직접 지웁니다 (같이 정하기 참가 기록은 지우지 않고 계정 연결만 끊습니다). 사용자와 연결된 새 테이블을 만들면 여기에도 추가합니다.
- 개발용 단축 로그인(`/api/auth/kakao/mobile`)은 `NODE_ENV=production`에서 막혀 있어야 합니다.
- 비밀값은 `.env`에만 두고 커밋하지 않습니다. 새 환경 변수는 `.env.example`에 추가합니다.

## 파일 형식

- 저장소의 텍스트 파일은 **LF** 줄바꿈입니다. 윈도우에서 CRLF로 바뀐 파일은 LF로 맞춰서 커밋합니다.
- 코드 주석과 문서는 한국어로 씁니다.

## PR 규칙

- 작업은 브랜치에서 하고 PR로 올립니다. 머지는 merge commit으로 합니다 (rebase하지 않습니다. 봇이 PR 브랜치에 커밋을 올릴 수 있습니다).
- **봇 리뷰(CodeRabbit, Copilot)**: 코멘트를 전부 반영하지 않습니다. 각 코멘트를 코드와 대조해 검증하고, 맞는 것만 고칩니다. 반영하지 않은 코멘트에는 PR 스레드에 이유를 짧게 답합니다.
- **머지 조건**: 아래가 모두 맞을 때만 머지합니다.
  1. 최신 `main`과 충돌이 없다.
  2. 최신 `main`을 합친 상태에서 테스트와 타입 검사가 통과한다.
  3. 봇 리뷰가 **최신 커밋에 대해 실제로 돌았고**, 그 코멘트를 처리했다. 리뷰를 받지 않은 PR은 머지하지 않습니다. CodeRabbit 한도(시간당 10회)가 차면 PR을 열어 두고 알립니다.
  4. 스택 PR이면 아래 PR이 먼저 머지됐다.
- 수정은 PR당 한 번에 모아서 푸시하고, 자동 리뷰가 멈추면 `@coderabbitai review`로 다시 요청합니다.
- 충돌이 나면 `main`을 브랜치에 merge해서 풀고, lockfile은 `main` 쪽을 받은 뒤 `npm install`로 다시 만들고, 테스트를 다시 돌린 뒤 푸시합니다.
- 머지한 뒤에는 열려 있는 다른 PR에 충돌이 생겼는지 확인합니다.
