# 디자인 토큰

메추리 앱의 색, 글꼴, 간격 규칙입니다. 디자인 시안 캔버스의 최종 조합안(홈은 미니멀 클린, 추리 질문과 결과는 커머스 레드, 같이·지도·내정보는 "탭 최종안")을 따르고, 코드는 `frontend/src/theme`에 있습니다.

```ts
import { colors, radii, typography, spacing, layout, depth } from '../theme';
```

## 테마색 바꾸기

앱 전체 강조색은 `frontend/src/theme/colors.ts`의 한 줄로 정합니다.

```ts
export const BRAND: BrandThemeName = 'tomato';
```

후보는 `tomato`(기본), `tangerine`, `quail`, `herb`, `cobalt`, `plum`, `charcoal`입니다. 각 후보는 아래 다섯 값을 가지며, 화면은 이 이름만 쓰므로 `BRAND`만 바꾸면 버튼, 탭 바, 진행 바, 칩 색이 함께 바뀝니다. 새 후보를 넣을 때는 `brand`가 흰 글자와 4.5:1 이상 대비가 나야 합니다(`theme.test.ts`가 모든 후보의 키가 같은지 확인).

| 이름 | tomato 값 | 쓰는 곳 |
| --- | --- | --- |
| `brand` | `#D9362B` | 주요 버튼, 선택 상태, 진행 바, 활성 탭 |
| `brandDeep` | `#B02A20` | 눌린 상태, 진한 강조 |
| `brandSoft` | `#FFE8E5` | 이유 칩, 사진 자리, 요약 상자 배경 |
| `brandText` | `#A82A20` | 흰 바탕 위 강조 글자, 링크 |
| `brandMid` | `#EC8A80` | 2·3위 순위 막대 같은 중간 톤 |

## 색 (`colors`)

회색 바탕에 흰 카드, 강조는 테마색 하나만 씁니다. 테마색 면 위 글자와 아이콘은 `onBrand`(흰색)입니다.

| 이름 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `bg` | `#F2F4F6` | 앱 기본 배경 |
| `surface` | `#FFFFFF` | 카드, 흰 버튼 |
| `fill` | `#F2F4F6` | 카드 안 회색 상자, 아이콘 자리, 입력칸 |
| `line` / `lineStrong` | `#E5E8EB` / `#D1D6DB` | 구분선 / 외곽선 버튼 |
| `ink` | `#191F28` | 본문·제목 글자 |
| `subtle` | `#4E5968` | 아이콘, 보조 제목 |
| `muted` | `#6B7684` | 보조 글자 (흰 바탕 4.7:1) |
| `faint` | `#8B95A1` | 꺼진 탭, 화살표처럼 글자가 아닌 장식 |
| `onBrand` | `#FFFFFF` | 테마색 면 위 글자 |
| `quail`, `quailDark`, `beak`, `blush` | 코드 참고 | 마스코트 추리(`QuailBadge`) |
| `leaf` | `#0A7D5E` | 완료, 성공 |
| `chili` | `#C2412D` | 오류, 삭제 |
| `chiliSoft` / `chiliText` | `#FDECEC` / `#A1281F` | 기피 태그(못 먹는 음식) 배경과 글자 |
| `star` | `#C98A00` | 별점 |
| `kakao` / `kakaoText` | `#FEE500` / `#191919` | 카카오 로그인 버튼 |
| `scrim` | `rgba(25,31,40,.45)` | 바텀시트 뒤 어두운 막 |

### 다크 모드 (`darkColors`)

같은 이름에 값만 바꿉니다. 테마색은 두 모드 모두 그대로입니다. 아직 앱은 라이트만 씁니다(`app.json`의 `userInterfaceStyle: light`).

## 글꼴 (`fonts`, `typography`)

모든 글자는 **Noto Sans KR** 한 가족을 굵기만 바꿔 씁니다. `App.tsx`가 `expo-font`의 `useFonts`로 400, 500, 700, 800, 900을 로드합니다(`fontRegistration.ts`). 로드에 실패하면 시스템 글꼴로 엽니다.

안드로이드는 커스텀 글꼴에서 `fontWeight`를 무시하므로, 굵기는 `fontWeight` 대신 글꼴 이름(`fonts.bold` 등)으로 고릅니다.

| 스타일 | 글꼴 | 크기/줄높이 | 예 |
| --- | --- | --- | --- |
| `display` | Noto 900 | 30/38 | 김치찌개 |
| `title` | Noto 900 | 24/32 | 국물 있는 음식이 당겨? |
| `heading` | Noto 800 | 17/24 | 요즘 많이 고른 메뉴 |
| `body` | Noto 400 | 15/22 | 칼칼하고 얼큰한 한국인의 소울푸드. |
| `button` | Noto 800 | 17/24 | 바로 추천 받기 |
| `answer` | Noto 800 | 17/24 | 응 / 아마도 / 상관없어 / 아니 |
| `caption` | Noto 500 | 13/18 | 질문 3 / 7 · 후보 메뉴 18개 |

## 간격, 모서리, 카드

- `spacing`: 4의 배수. `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 24`, `xxl 32`.
- `layout.screenPadding`: 화면 좌우 여백 20.
- `layout.buttonHeight` 56, `layout.answerHeight` 64, `layout.minTouch` 44.
- `radii`: `xs 8`(작은 배지), `sm 12`(입력·작은 버튼), `md 16`(버튼), `lg 24`(카드), `full 999`(칩·태그).
- `depth`: 카드는 테두리와 그림자 없이 흰 면(`depth.card`)만 씁니다. 지도 위에 떠 있는 검색창·카드만 `depth.float` 그림자를 씁니다. 누르면 `depth.pressed`(조금 투명해짐).

```tsx
<Pressable
  style={({ pressed }) => [
    { height: layout.buttonHeight, borderRadius: radii.md, backgroundColor: colors.brand },
    pressed && depth.pressed,
  ]}
>
  <Text style={[typography.button, { color: colors.onBrand }]}>바로 추천 받기</Text>
</Pressable>
```

## 아이콘과 마스코트

- 탭 바와 목록 아이콘은 `@expo/vector-icons`의 Ionicons를 씁니다. 켜진 탭은 채운 아이콘에 `brand`, 꺼진 탭은 외곽선 아이콘에 `faint`.
- 마스코트 추리는 `components/QuailBadge`로 동그라미 안에 그립니다(홈 카드, 추리 질문 카드, 내정보 프로필).

## 말투

추리(마스코트)는 짧은 반말, 시스템 문구(오류, 권한 안내)는 존댓말로 씁니다.

- 질문: 국물 있는 음식이 당겨?
- 결과: 오늘은 김치찌개가 딱이야!
- 오류: 주변 식당을 불러오지 못했어요. 위치 권한을 확인해 주세요.
