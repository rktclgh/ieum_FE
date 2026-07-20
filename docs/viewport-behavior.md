# iOS 뷰포트 동작 — 실측 기록

이 문서는 **추측이 아니라 실기기에서 잰 값**이다. 레이아웃·safe-area·상태바 관련 작업을 시작하기 전에 반드시 읽는다.

같은 이음매를 #269·#279·#304·#334·#381·#395·#411로 일곱 번 고쳤고, 매번 실패했다. 실패 원인은 실력이 아니라 **기록이 전부 추측이었다는 것**이다. 서로 모순되는 주석이 쌓여 다음 사람이 반대 방향으로 또 고쳤다.

## 측정 조건

- iPhone 16 Pro (`402x874 @3x`), iOS 18.7
- 홈 화면에 추가해 **standalone으로 실행** (사파리 탭에서는 값이 다르다)
- `viewport-fit=cover`
- `statusBarStyle`만 다른 두 페이지를 각각 홈 화면에 추가해 비교

## `statusBarStyle: black-translucent`

| 상태 | `innerHeight` | ICB | `100vh` | `100lvh` | `100dvh` | `100svh` | `100%` |
|---|---|---|---|---|---|---|---|
| 로드 직후 | **812** | 812 | 874 | 874 | 812 | 812 | 812 |
| 스크롤 후 | **874** | 812 | 874 | 874 | 812 | 812 | 812 |

`safe-area`: `top=62 bottom=34 left=0 right=0`

1. **뷰포트가 812↔874로 흔들린다.** 변동폭 62px = `safe-area-top`. 로드 직후 812였다가 첫 스크롤 이후 874가 되어 유지된다.
2. **`position: fixed`는 이 흔들리는 뷰포트를 따라간다.** `fixed bottom-0`인 탭바는 스크롤에 따라 62px 위아래로 움직인다.
3. **812 상태에서는 화면 하단 62px이 뷰포트 바깥이다.** CSS로 아무것도 칠할 수 없다. `fixed inset-0` 아래로 검은 띠가 남는 것을 육안으로 확인했다.
4. `100vh`/`100lvh`(874)와 `100dvh`/`100svh`/`100%`(812)가 **62px 어긋난 채 공존한다.**

## `statusBarStyle: default`

`innerHeight = ICB = 100dvh = 100% = 812`으로 **완전히 일치한다.** `safe-area`: `top=0 bottom=34`.

상단 62px은 iOS가 소유하고 직접 칠한다. 페이지는 그 아래에서 시작한다. `--safe-area-top`이 standalone에서 0이 되는 것은 회귀가 아니라 정상이다.

## #381과 #414는 둘 다 맞았다

- #381이 보고한 "하단 공백" = **812 상태**
- #414가 보고한 "이미 꽉 참" = **874 상태**

누구도 틀리지 않았다. 변수를 통제한 사람이 없었을 뿐이다.

#409가 `--icb-shortfall`로 62px을 보정했다가 탭바가 화면 밖으로 밀려난 것도 같은 이유다 — 보정을 확인한 시점의 상태가 874였다.

**이 기록을 근거로 어느 한쪽 주장만 인용해 코드를 고치지 말 것.** 상태를 먼저 확인해야 한다.

## `@media (display-mode: standalone)`은 iOS에서 매칭되지 않는다

standalone으로 실행 중인데도 `matchMedia("(display-mode: standalone)")`가 `false`를 반환했다. `navigator.standalone`만 `true`였다.

**CSS 미디어쿼리로 모드를 분기하면 iOS에서 영영 적용되지 않는다.** 모드 분기가 필요하면 `navigator.standalone`을 읽어 JS로 처리하고 CSS 변수로 내려보낸다.

## 현재 채택

`statusBarStyle: default`.

뷰포트 안정성을 택했다. standalone에서 지도가 상태바 뒤로 가는 연출은 포기한다.

`black-translucent`는 값을 맞추면 되는 문제가 아니라 **구조적으로 비호환**이다. 탭바가 62px 움직이고, 홈 지도는 스크롤이 없어 812 상태에 고정되므로 하단 62px 죽은 띠가 상시 발생한다. edge-to-edge를 가장 원하는 화면에서 정반대 결과가 난다.

사파리 탭에서는 `safe-area-top`이 실측값으로 들어오므로 그쪽은 그대로 동작한다.

## 재측정 방법

`black-translucent` 재도전이나 새 iOS 버전 확인이 필요하면, 저장소 밖 독립 HTML로 프로브를 만들어 홈 화면에 추가해 잰다. 앱 안에서 재면 인증·라우팅이 얽혀 변수가 늘어난다.

측정할 것: `innerHeight`, `document.documentElement.clientHeight`, `env(safe-area-inset-*)`(숨은 엘리먼트의 padding으로 옮겨 심어 `getComputedStyle`로 읽는다), 각 뷰포트 단위가 푸는 값, 그리고 **스크롤 전후로 값이 변하는지**.

마지막 항목이 핵심이다. 한 상태에서만 재면 일곱 번의 실패를 반복하게 된다.

---

# 후속 측정 — black-translucent 재도전 (지도 edge-to-edge)

위 기록으로 `default`를 택했으나, 홈 지도를 상태바 뒤까지 채우려면 `black-translucent`가 유일한 길이라 재도전했다. 이번엔 7번의 실패와 다른 앵커를 실기기로 검증했다.

## 측정 (iPhone 16 Pro / iOS 18.7)

| 단위/값 | Safari 탭 | PWA standalone |
|---|---|---|
| screen.height | 874 | 874 |
| innerHeight 흔들림 | 714↔754 | **812↔874** |
| `100lvh` | 754 | **874 (안정)** |
| safe-area top/bottom | 0 / 0 | **62 / 34** |

두 가지 하단 앵커를 나란히 놓고 스크롤로 흔들림을 유발해 비교:

- **`bottom: 0`** — 흔들리는 뷰포트를 따라가 위아래로 움직인다(7번의 시도가 쓴 방식, 실패의 원인).
- **`top: calc(100lvh - H)`** — **PWA standalone에서 흔들림에도 고정.** Safari에서는 브라우저 크롬 때문에 어긋난다.

## 결론

`black-translucent`의 812↔874 흔들림은 피할 수 없지만, **하단 요소를 흔들리는 `bottom:0`(ICB)이 아니라 안정적인 `100lvh` 상단 앵커로 잡으면 고정된다.** 이것이 7번의 시도와 근본적으로 다른 지점이다.

단, `100lvh` 앵커는 Safari에서는 틀리다(브라우저 크롬이 lvh를 흔든다). 따라서 **모드 분기가 필수**다:

- **standalone** → `top: calc(100lvh - 요소높이)`
- **Safari** → `bottom: 0`

모드 감지는 `navigator.standalone`(+ `display-mode: standalone` 폴백)을 head 인라인 스크립트로 읽어 `<html data-standalone>`을 첫 페인트 전에 심는다. **`@media (display-mode: standalone)`은 iOS standalone에서 매칭되지 않으므로(위 기록 참고) CSS로는 분기할 수 없다.**

## 지도

지도(bleed)는 `fixed inset-0`(ICB=812) 대신 `height: 100lvh`(=874, 안정)로 화면 전체(상태바 뒤 ~ 홈 인디케이터)를 채운다.
