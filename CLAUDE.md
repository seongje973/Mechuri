# CLAUDE.md

Mechuri(메추리)는 질문 몇 개에 답하면 오늘 먹을 메뉴를 골라 주는 "메뉴 추천" 앱이다. `frontend/`는 Expo SDK 54 + React Native 0.81 + TypeScript, `backend/`는 Node 20 + Express + Sequelize + PostgreSQL이다. 이 문서에는 꼭 지켜야 하는 규칙만 둔다. 설치와 실행은 `README.md`, 배포는 `docs/deploy.md`를 본다.

## 작업 원칙

속도보다 신중함을 우선한다. 아주 작은 작업은 판단해서 가볍게 처리한다.

### 먼저 생각한다

추측하지 않는다. 헷갈리는 점을 숨기지 않는다. 장단점을 드러낸다.

- 구현 전에 가정을 분명히 말한다. 확실하지 않으면 묻는다.
- 해석이 여러 가지면 하나를 몰래 고르지 말고 선택지를 보여 준다.
- 더 단순한 방법이 있으면 말하고, 필요하면 반대 의견을 낸다.
- 불분명하면 멈추고, 무엇이 헷갈리는지 짚어서 묻는다.
- 불필요한 인사 없이 바로 답한다. 간단한 질문은 짧게, 복잡한 작업은 충분히 자세히 답한다.
- 확실하지 않은 사실·날짜·수치·출처는 확실하지 않다고 먼저 밝힌다.

### 단순하게 만든다

문제를 푸는 최소한의 코드만 쓴다. 추측으로 미리 만들지 않는다.

- 요청하지 않은 기능, 한 번만 쓰는 추상화, 요청하지 않은 "유연성"·설정 옵션, 일어날 수 없는 경우의 예외 처리를 넣지 않는다.
- 200줄로 쓴 것이 50줄로 될 수 있으면 다시 쓴다. "시니어 엔지니어가 보면 과하다고 할까?"를 묻고, 그렇다면 줄인다.
- 새로 만들기 전에 있는 것을 찾는다. 컴포넌트는 `src/components/`, 색·글꼴은 `src/theme/`, 스크립트는 각 `package.json`에 이미 있는지 먼저 본다. 임시 빌드·테스트 스크립트를 따로 만들지 않는다.

### 필요한 곳만 고친다

꼭 필요한 부분만 건드리고, 내가 만든 흔적만 정리한다.

- 주변 코드·주석·포맷을 "개선"하지 않는다. 고장 나지 않은 것은 리팩터링하지 않는다. 내 취향과 달라도 기존 스타일을 따른다.
- 관련 없는 죽은 코드는 지우지 말고 알린다. 내 변경으로 안 쓰게 된 import·변수·함수만 지운다.
- 요청받지 않은 파일·문단·구조는 바꾸지 않는다. 바뀐 줄은 모두 요청으로 설명할 수 있어야 한다.
- 큰 변경, 삭제, 덮어쓰기, 외부 전송은 무엇을 바꿀지 먼저 설명하고 확인을 받는다.
- 작업이 끝나면 바뀐 점과 확인이 필요한 점을 짧게 정리한다.

### 목표를 정하고 검증으로 끝낸다

성공 기준을 정하고, 검증될 때까지 반복한다.

- 작업을 확인 가능한 목표로 바꾼다. 검증 추가 → 잘못된 입력 테스트를 쓰고 통과시킨다. 버그 수정 → 재현 테스트를 쓰고 통과시킨다. 리팩터링 → 전후로 테스트가 통과하는지 확인한다.
- 여러 단계 작업은 짧은 계획을 먼저 적는다. 형식: `1. [단계] → 확인: [검사]`
- 완료는 검증 명령을 직접 돌리고 결과를 확인한 뒤에만 말한다. "되게 하기" 같은 약한 기준은 계속 확인을 받아야 하니, 강한 기준을 세운다.

## 경계

**먼저 확인받는다** (준비와 로컬 검증은 묻기 전에 끝내 둔다)

- 새 외부 패키지 추가, 메이저 버전 올리기
- 이미 머지된 마이그레이션 수정, 데이터를 지우는 마이그레이션
- 배포 설정 변경: `render.yaml`, `backend/Dockerfile`, `frontend/eas.json`, `frontend/app.json`
- 이미 있는 API의 응답 필드를 지우거나 이름·형식을 바꾸는 변경
- 요청하지 않은 파일·문단 삭제나 덮어쓰기, 외부 서비스에 쓰기

**하지 않는다**

- 비밀값(`.env`, 토큰, 카카오 키)을 출력하거나 커밋하지 않는다. 새 환경 변수는 이름만 `.env.example`에 추가한다.
- 생성되는 파일을 손으로 고치지 않는다. `package-lock.json`은 `npm install`로 다시 만든다.
- 테스트를 지우거나 건너뛰게 해서 통과시키지 않는다. 실패 원인을 고친다.

그 밖의 읽기, 로컬 수정, 테스트, 브랜치·PR 작업은 묻지 않고 진행한다.

## 구조

- import는 `screens → components → engine · storage · api · constants · theme` 방향으로만 한다. `components`와 그 아래 폴더는 `screens`를 import하지 않고, `engine`은 `components`·`screens`를 import하지 않는다.
- `src/engine/`은 순수 함수만 둔다. React, React Native, AsyncStorage, 네트워크를 쓰지 않는다 (타입 import는 괜찮다).
- 서버 호출은 `fetch` 대신 `apiFetch('/api/...')`(`src/api/client.ts`)를 쓴다. 서버 주소와 로그인 토큰이 여기서만 붙는다.
- 휴대폰에 깔린 앱은 바로 업데이트되지 않는다. API는 필드를 추가하는 방식으로 바꾸고, 앱이 새 API를 쓰면 서버를 먼저 배포한다.

## 프론트엔드 규칙

- 색·글꼴·간격은 `src/theme`에서만 가져온다. 화면 파일에 hex 값이나 별도 팔레트를 만들지 말고 `colors.*` 토큰을 쓴다.
- 테마색은 `src/theme/colors.ts`의 `BRAND` 한 줄로만 바꾼다. 코드에서는 `colors.brand`·`brandDeep`·`brandSoft`·`brandText`·`onBrand`를 쓴다. 새 후보색은 흰 글자와 4.5:1 이상 대비가 나야 한다.
- 굵기는 `fontWeight` 대신 `fontFamily`(`fonts.*` 또는 `typography.*`)로 정한다. 이모지만 있는 텍스트에는 `fontFamily`를 넣지 않는다.
- `SafeAreaView`는 `react-native` 대신 `react-native-safe-area-context`에서 가져오고, 탭 화면은 기본적으로 `edges={['top']}`을 준다.
- Expo API는 SDK 54 문서(`https://docs.expo.dev/versions/v54.0.0/`)를 기준으로 쓴다.

## 백엔드 규칙

- 모델(`src/models/`)을 추가하거나 컬럼을 바꾸면 같은 PR에 마이그레이션을 넣는다 (`npm run db:migration:new -- <이름>`). 운영은 `sync` 없이 마이그레이션만 적용한다.
- 사용자와 연결된 테이블을 새로 만들면 회원 탈퇴(`src/user/deleteAccount.js`)에도 처리를 추가한다.
- 개발용 단축 로그인(`/api/auth/kakao/mobile`)은 `NODE_ENV=production`에서 막힌 상태를 유지한다.

## 테스트와 주석

- 테스트는 변경 전에는 실패하고 변경 후에는 통과하는 것만 추가한다. 이미 통과하는 테스트, 고친 함수를 mock하고 그 mock을 확인하는 테스트는 넣지 않는다.
- 추천 로직(`src/engine/`)을 바꾸면 `engine/__tests__`에 테스트를 함께 쓴다.
- 주석은 코드만 보고 알 수 없는 이유(플랫폼 버그, 호출 순서, 바꾸면 안 되는 값)만 쓴다. 다음 줄을 되풀이하거나 버그의 경위를 적지 않는다. 경위는 PR 설명에 쓴다. 내 변경으로 틀리게 된 주석은 고친다.

## 검증

바꾼 경로의 명령을 돌린다. 문서만 바꿨으면 내용·링크 검토로 끝낸다.

- `frontend/` → `npm test --prefix frontend && npm run typecheck --prefix frontend`
- `frontend/src/constants/menuData.ts` → 위 명령 + `npm run check:menu --prefix frontend`
- `backend/` → `npm test --prefix backend`
- `backend/src/models/`, `backend/migrations/` → 빈 테스트 DB로 `TEST_DATABASE_URL=postgres://.../mechuri_test npm test --prefix backend`

함정:

- `TEST_DATABASE_URL`을 주면 그 DB의 public 스키마를 지운다. 이름이 `_test`로 끝나는 빈 로컬 DB만 쓴다 (원격은 `ALLOW_REMOTE_TEST_DB=true`가 필요하다). 이 값이 없으면 DB 테스트는 건너뛰므로 "통과"가 마이그레이션 검증을 뜻하지 않는다.
- 질문 id는 `frontend/src/constants/akinatorQuestions.ts`와 `backend/src/realtime/questionOrder.js` 양쪽에 있다. 한쪽을 바꾸면 다른 쪽도 바꾼다 (백엔드 테스트가 확인한다).
- `react-test-renderer`는 `react`와 같은 정확한 버전(19.1.0)으로 고정한다. 범위로 바꾸면 npm ERESOLVE가 난다.
- 패키지 매니저는 npm만 쓴다 (yarn, pnpm 금지).

## 파일 형식

- 텍스트 파일은 LF 줄바꿈이다. CRLF로 바뀐 파일은 LF로 맞춰 커밋한다.
- 코드 주석과 문서는 한국어로 쓴다.

## PR과 리뷰

- 작업은 브랜치에서 하고 PR로 올린다. PR 하나는 한 가지 일만 하고, 한 번에 읽을 수 있는 크기로 만든다. 이유가 둘이면 PR을 나눈다.
- PR은 직접 머지하지 않는다. 머지는 사용자가 한다. PR이 준비되면 준비됐다고 알린다.
- PR 브랜치는 rebase·force push하지 않는다 (봇이 PR 브랜치에 커밋을 올릴 수 있다).
- 봇 리뷰(CodeRabbit, Copilot) 코멘트는 코드와 대조해 검증하고 맞는 것만 고친다. 반영하지 않은 코멘트에는 이유를 짧게 답한다.
- 수정은 한 번에 모아 푸시하고, 자동 리뷰가 멈추면 `@coderabbitai review`로 다시 요청한다.
- 충돌은 `main`을 브랜치에 merge해서 풀고, lockfile은 `main` 쪽을 받은 뒤 `npm install`로 다시 만든다. 머지한 뒤에는 열린 다른 PR에 충돌이 생겼는지 확인한다.

## 이 문서 관리

- 코드나 설정을 보면 알 수 있는 내용(폴더 목록, 스크립트 전체)과 일반론은 쓰지 않는다. 지키지 않으면 실제로 문제가 나는 규칙만 둔다.
- 금지 규칙에는 대신 할 행동을 함께 쓴다.
- 작업하다 새 함정을 찾으면 한 줄로 "함정"에 추가하고, 그 수정과 같은 PR에 넣는다. 틀린 규칙은 발견한 PR에서 고치거나 지운다.
