# 배포 가이드 (US-31)

서버는 Render(Docker + PostgreSQL), 앱은 EAS Build로 안드로이드 APK를 만들어 지인에게 나눠 주는 순서입니다.
설정 파일은 저장소에 준비되어 있고, 계정이 필요한 단계만 직접 하면 됩니다.

| 파일 | 역할 |
| --- | --- |
| `render.yaml` | Render Blueprint. API 서버(`mechuri-api`)와 PostgreSQL(`mechuri-db`)을 만든다 |
| `backend/Dockerfile` | 서버 이미지. 켤 때 밀린 마이그레이션을 적용하고 서버를 띄운다 |
| `backend/migrations/` | DB 스키마. 운영은 `sync`를 쓰지 않고 이것만 적용한다 |
| `frontend/eas.json` | `preview` = 설치용 APK, `production` = 스토어용 AAB |

## 1. 서버 (Render)

1. [Render](https://render.com)에 GitHub 계정으로 가입하고 이 저장소 접근을 허용합니다.
2. Dashboard → **New → Blueprint** → 이 저장소 → `render.yaml`이 읽히면 **Apply**.
3. 처음 만들 때 비어 있는 값 두 개를 넣습니다.
   - `KAKAO_REST_API_KEY`: 카카오 개발자 콘솔의 REST API 키
   - `KAKAO_REDIRECT_URI`: `https://<서비스 주소>/api/auth/kakao/callback`
     (서비스 이름이 `mechuri-api`로 만들어졌으면 `https://mechuri-api.onrender.com/api/auth/kakao/callback`)
4. 배포가 끝나면 `https://<서비스 주소>/`에서 `"status": "Running"`이 보이는지 확인합니다.
   서버 로그에 `migrated`와 `Database sync skipped`가 찍혀야 정상입니다.
5. 카카오 개발자 콘솔 → 카카오 로그인 → Redirect URI에 3번의 주소를 추가합니다.

`JWT_SECRET`은 Render가 무작위로 만들어 줍니다. 바꾸면 기존 로그인이 모두 풀립니다.

### 무료 플랜에서 알아 둘 것

- 웹 서비스는 15분 동안 요청이 없으면 잠들고, 다음 요청에 30초~1분 정도 늦게 깨어납니다. 지인 테스트 중에는 앱을 열 때 첫 추천이 느릴 수 있습니다.
- 무료 PostgreSQL은 만든 지 30일이 지나면 만료됩니다(유예 기간 후 삭제). 테스트 기간이 30일을 넘거나 데이터를 남겨야 하면 유료 플랜으로 올리거나 만료 전에 `pg_dump`로 백업하세요.
- 서버와 DB는 서울에서 가까운 `singapore` 리전으로 잡았습니다.

### 직접 Docker로 띄워 보기

```bash
docker build -t mechuri-api backend
docker run -p 5000:5000 --env-file backend/.env -e NODE_ENV=production \
  -e DATABASE_URL=postgres://postgres:mechuri_password@host.docker.internal:5432/mechuri_db mechuri-api
```

## 2. DB 스키마 바꾸기

운영 서버는 테이블을 자동으로 바꾸지 않습니다(`NODE_ENV=production`이면 `sync`를 건너뜀).

1. `src/models/`를 고친다.
2. `cd backend && npm run db:migration:new -- <이름>`으로 마이그레이션을 만들고 `up`/`down`을 채운다.
3. `TEST_DATABASE_URL=... npm test`로 모델과 마이그레이션이 맞는지 확인한다.
4. main에 머지하면 Render가 다시 배포하고, 서버가 켜질 때 새 마이그레이션을 적용한다.

서버가 켜질 때마다 마이그레이션을 돌리는 방식은 인스턴스가 1대일 때를 기준으로 합니다. 여러 대로 늘리기 전에는 마이그레이션을 배포 단계 한 곳(예: Render의 Pre-Deploy Command)으로 옮기세요. 동시에 켜지면 같은 마이그레이션을 두 번 돌릴 수 있습니다.

컬럼을 지우거나 이름을 바꾸는 마이그레이션은 이전 버전 서버가 잠깐 같이 돌 수 있으니, "새 컬럼 추가 → 앱이 새 컬럼 사용 → 옛 컬럼 삭제"처럼 나눠서 배포하는 편이 안전합니다.

## 3. 카카오 로그인 1회용 코드

카카오 로그인이 끝나면 서버는 60초짜리 1회용 코드를 딥링크로 앱에 넘기고, 앱이 그 코드와 verifier로 토큰을 받습니다.
이 코드는 이제 메모리가 아니라 DB의 `LoginCodes` 테이블에 둡니다.

- 서버가 재시작되거나 여러 대로 늘어나도 코드 교환이 끊기지 않습니다.
- 코드 원문은 저장하지 않고 SHA-256 해시만 저장합니다.
- 교환은 `DELETE ... RETURNING` 한 문장이라 같은 코드를 동시에 두 번 내도 한 번만 성공합니다.
- 만료된 행은 새 코드를 만들 때 지웁니다.

## 4. 안드로이드 APK (EAS Build)

```bash
npm install -g eas-cli
cd frontend
eas login                       # Expo 계정
eas init                        # 프로젝트 연결 (app.json에 projectId가 들어감)
eas env:set --name EXPO_PUBLIC_KAKAO_CLIENT_ID --value "카카오_REST_API_키" --environment preview --environment production --visibility plaintext
eas build -p android --profile preview
```

`"카카오_REST_API_키"` 자리에 실제 키를 따옴표째 넣으세요.

- 처음 빌드할 때 안드로이드 패키지 이름(예: `com.seongje973.mechuri`)을 물어보면 정해서 넣습니다. 한 번 정하면 스토어에 올린 뒤에는 바꿀 수 없습니다.
- 빌드가 끝나면 나오는 링크(또는 QR)로 APK를 받아 설치합니다. 지인에게는 이 링크를 보내면 됩니다.
- 서버 주소는 `eas.json`의 `EXPO_PUBLIC_API_URL`입니다. Render 서비스 주소가 `mechuri-api.onrender.com`이 아니면 이 값을 고치세요.
- 스토어용은 `--profile production`(AAB)입니다. 버전 코드는 EAS가 빌드마다 올립니다.

## 배포 전 확인

- [ ] Render 서버 `/` 응답 확인, 로그에 마이그레이션 적용 확인
- [ ] 카카오 Redirect URI가 서버의 `KAKAO_REDIRECT_URI`와 같음
- [ ] `eas.json`의 `EXPO_PUBLIC_API_URL`이 실제 서버 주소
- [ ] APK에서 카카오 로그인 → 앱으로 돌아와 로그인됨 (`mechuri://` 스킴)
- [ ] 즐겨찾기 저장 후 서버를 재시작해도 남아 있음
