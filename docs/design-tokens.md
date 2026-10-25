# 디자인 토큰

메추리 앱의 색, 글꼴, 간격 규칙입니다. 값은 디자인 시안 캔버스의 "메추리 디자인 가이드 v0.1" 보드에서 가져왔고, 코드는 `frontend/src/theme`에 있습니다.

```ts
import { colors, radii, typography, spacing, layout, depth } from '../theme';
```

화면은 아직 이 토큰으로 옮기지 않았습니다. 지금 열린 PR들이 화면 파일을 고치고 있어서, 화면 정리는 그 PR들이 합쳐진 뒤에 따로 합니다.

## 색 (`colors`)

화면의 80%는 크림과 흰색, 강조는 노른자 한 가지만 씁니다. 노른자 위 글자는 흰색이 아니라 `ink`를 씁니다(대비 7.7:1).

| 이름 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `cream` | `#FFF7EC` | 앱 기본 배경 |
| `surface` | `#FFFFFF` | 카드, 흰 버튼 |
| `shell` | `#F3E4CC` | 보조 면, 칩 배경, 사진 자리 |
| `line` | `#EAD9C0` | 카드 테두리, 구분선 |
| `ink` | `#2E2219` | 본문·제목 글자, 노른자 위 글자 |
| `muted` | `#75604F` | 보조 글자 (크림 위 5.5:1) |
| `yolk` | `#F5A623` | 주요 버튼, 선택 상태, 진행 바 |
| `yolkDeep` | `#D98A0B` | 노른자 버튼의 아래 테두리 |
| `yolkSoft` | `#FDE7BF` | 이유 태그 배경 |
| `quail` | `#B07A4A` | 마스코트 몸통, 일러스트 |
| `feather` | `#8A5A32` | 보조 강조 글자, 링크, 아이콘 |
| `blush` | `#F28B6B` | 마스코트 볼, 하트·좋아요 장식만 |
| `leaf` | `#2F7A55` | 완료, 성공, "모두 OK" |
| `chili` | `#C2412D` | 오류, 삭제 |
| `chiliSoft` / `chiliText` | `#FBE3DD` / `#9E2F1F` | 기피 태그(못 먹는 음식) 배경과 글자 |
| `kakao` | `#FEE500` | 카카오 로그인 버튼 |
| `scrim` | `rgba(46,34,25,.45)` | 바텀시트 뒤 어두운 막 |

### 다크 모드 (`darkColors`)

같은 이름에 값만 바꿉니다. 노른자는 두 모드 모두 그대로입니다. 아직 앱은 라이트만 씁니다(`app.json`의 `userInterfaceStyle: light`).

| 이름 | 다크 값 | 출처 |
| --- | --- | --- |
| `cream` | `#1F1813` | 가이드 |
| `surface` | `#2B221B` | 가이드 |
| `shell` | `#3A2E24` | 가이드 |
| `ink` | `#F7EDE0` | 가이드 |
| `muted` | `#C9B5A0` | 가이드 |
| `line`, `yolkSoft`, `feather`, `leaf`, `chili`, `chiliSoft`, `chiliText`, `scrim` | 코드 참고 | 가이드에 없어 어두운 바탕 대비에 맞춰 정함 |

## 글꼴 (`fonts`, `typography`)

제목과 추리의 대사는 **Jua(주아)**, 본문과 버튼은 **Noto Sans KR**입니다. `App.tsx`가 `expo-font`의 `useFonts`로 `@expo-google-fonts/jua`, `@expo-google-fonts/noto-sans-kr`(400, 500, 700)를 로드합니다. 로드 중에는 크림 배경만 보이고, 로드에 실패하면 시스템 글꼴로 엽니다.

안드로이드는 커스텀 글꼴에서 `fontWeight`를 무시하므로, 굵기는 `fontWeight` 대신 글꼴 이름(`fonts.bold` 등)으로 고릅니다.

| 스타일 | 글꼴 | 크기/줄높이 | 예 |
| --- | --- | --- | --- |
| `display` | Jua | 34/42 | 오늘은 김치찌개 어때? |
| `title` | Jua | 24/32 | 국물 있는 음식이 당겨? |
| `heading` | Noto 700 | 18/26 | 이런 대안도 있어요 |
| `body` | Noto 400 | 16/24 | 칼칼하고 얼큰한 한국인의 소울푸드. |
| `button` | Noto 700 | 17/24 | 추리한테 물어보기 |
| `answer` | Jua | 20/24 | 응! / 아마도? / 상관없어 / 아니 |
| `caption` | Noto 500 | 13/18 | 남은 후보 18개 · 3 / 7 질문 |

```tsx
<Text style={[typography.title, { color: colors.ink }]}>국물 있는 음식이 당겨?</Text>
```

## 간격, 모서리, 두께

- `spacing`: 4의 배수. `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 24`, `xxl 32`.
- `layout.screenPadding`: 화면 좌우 여백 20.
- `layout.buttonHeight` 56, `layout.answerHeight` 64, `layout.minTouch` 44, 마스코트 최소 크기 `layout.mascotMin` 40.
- `radii`: `sm 12`(칩·입력), `md 16`(버튼), `lg 24`(카드), `full 999`(태그).
- `depth`: 흐린 그림자 대신 아래쪽에 짙은 4px 테두리를 줍니다. 누르면 `depth.pressed`(1px, 2px 내려감).

```tsx
<Pressable
  style={({ pressed }) => [
    { height: layout.buttonHeight, borderRadius: radii.md, backgroundColor: colors.yolk },
    pressed ? depth.pressed : depth.raised,
  ]}
>
  <Text style={[typography.button, { color: colors.ink }]}>추리한테 물어보기</Text>
</Pressable>
```

## 말투

추리(마스코트)는 짧은 반말, 시스템 문구(오류, 권한 안내)는 존댓말로 씁니다.

- 질문: 국물 있는 음식이 당겨?
- 결과: 오늘은 김치찌개가 딱이야!
- 오류: 주변 식당을 불러오지 못했어요. 위치 권한을 확인해 주세요.
