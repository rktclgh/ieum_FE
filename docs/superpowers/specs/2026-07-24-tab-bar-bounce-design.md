# 하단 탭 바 컨테이너 바운스 효과 설계

**Issue:** rktclgh/ieum_FE#496
**Branch:** `feat/#496`
**Status:** approved 2026-07-24

## 목표

탭 전환 시 이미 존재하는 활성 pill 슬라이딩 애니메이션과 동시에, 탭 바 컨테이너(pill들을 감싸는 바깥 rounded-full 바) 자체가 살짝 확대되었다가 인디케이터가 도착하는 순간 원래 크기로 줄어드는 바운스 효과를 추가한다.

## 범위와 비범위

### 포함

- `tab-bar.tsx`의 pill 컨테이너(`relative flex w-full ... rounded-full ...` div)에 스케일 바운스 애니메이션을 추가한다.
- `globals.css`에 이 효과 전용 예외 이징 토큰 `--ease-bounce`를 추가한다.
- 탭이 빠르게 연속으로 바뀌어도 애니메이션이 매번 처음부터 재시작되게 한다.

### 제외

- 슬라이딩 인디케이터(활성 하이라이트 pill) 자체의 동작 변경. 기존 `translateX` 로직은 그대로 둔다.
- 아이콘 크로스페이드 타이밍 변경.
- 새 의존성(Framer Motion 등) 추가 — 기존과 동일하게 순수 CSS로 구현한다.

## 애니메이션 사양

균일 스케일(가로+세로 동시), `transform-origin: center`. 4단 키프레임, 전체 길이는 기존 슬라이딩과 동일하게 `--motion-duration-base`(300ms)를 공유한다.

| 시점 | scale | 의미 |
| --- | --- | --- |
| 0% | 1 | 탭 전환 시작 |
| 20% | 1.05 | 확대 완료 |
| 80% | 1.05 | 인디케이터 이동 중 피크 유지 |
| 100% | 1 | 인디케이터 도착과 동시에 축소 완료 |

```css
@keyframes tab-bar-bounce {
  0%, 100% {
    transform: scale(1);
  }
  20%,
  80% {
    transform: scale(1.05);
  }
}
```

## 새 예외 토큰: `--ease-bounce`

`--ease-base`(0.32, 0.72, 0, 1)를 그대로 쓰면 확대·축소가 슬라이딩과 같은 부드러운 감속 곡선이라 "바운싱"보다는 "따라 커지는" 느낌에 가깝다. 이 효과 하나만 예외로, 목표치를 넘어서는 오버슈트 없이 확대는 빠르게 감속하고 축소는 끝에서 살짝 탄력 있게 안착하는 곡선을 쓴다.

```css
/*
 * 탭 바 바운스 전용 — issue #496. #280 단일 기준(ease-base)의 의도적 예외다.
 * ease-base보다 급격하게 감속해 "튕기는" 인상을 준다. 목표치를 넘어서는
 * 오버슈트는 없다 — 단순 확대→축소 펄스이지 스프링 반동이 아니다.
 * 다른 용도로 가져다 쓰기 전에: 이 바운스 펄스와 같은 성격의 모션인지 먼저 확인할 것.
 * 그게 아니면 `--ease-base`가 맞다.
 */
--ease-bounce: cubic-bezier(0.22, 1, 0.36, 1);
```

`--motion-duration-keyboard`와 같은 자리(`:root`, `--tab-bar-*` 토큰 근처)에 문서화해 추가한다. `prefers-reduced-motion: reduce`에서는 별도 처리 없이 `--motion-duration-base`가 0.01ms로 줄어들며 이 애니메이션도 함께 무력화된다(기존 패턴 그대로).

## 트리거·재시작 처리

`TabBarNav`는 라우트가 바뀌어도 언마운트되지 않는 단일 인스턴스로 유지된다(issue #280) — 즉 pill 컨테이너 DOM 노드도 절대 재생성되지 않으므로, `activeIndex`가 바뀔 때마다 CSS `animation`을 강제로 재시작하는 처리가 필요하다(값이 그대로면 속성만 다시 세팅해도 브라우저가 애니메이션을 다시 틀지 않는다).

pill 컨테이너에 `data-bounce` 불리언 속성을 두고, `activeIndex` 변경을 감지하는 `useEffect`에서:

1. `data-bounce`를 제거한다.
2. `element.offsetWidth`를 읽어 강제로 reflow시킨다.
3. `data-bounce="true"`를 다시 세팅한다.

```css
[data-bounce="true"] {
  animation: tab-bar-bounce var(--motion-duration-base) var(--ease-bounce);
}
```

최초 마운트 시(`activeIndex`의 첫 값)에는 트리거하지 않는다 — 페이지 첫 진입에서 바가 바운스할 이유가 없다.

## 레이아웃 위험 요소와 결론

- **FAB 앵커(`--tab-bar-pill-top`):** transform은 레이아웃 박스 치수에 영향을 주지 않으므로 `offsetHeight` 기반 앵커 계산은 안전하다. 확대 순간(+5%, pill 높이 60px 기준 +3px 수준) FAB와 시각적으로 아주 살짝 겹칠 수 있으나, 크기가 작아 무시 가능한 수준으로 판단한다.
- **가로 확대와 여백:** 바깥 wrapper가 `min-w-80 px-4`라 좌우 16px 여백이 있다. pill 폭이 5% 늘어도(대략 화면 폭의 절반 크기 pill 기준 수 px~10px 수준) 이 여백 안에서 흡수될 것으로 예상하지만, 실기기/좁은 화면(360px 폭 등)에서 시각적으로 잘리거나 여백을 침범하지 않는지 확인이 필요하다.
- **safe-area/홈 인디케이터:** `SCREEN_BOTTOM_GAP`(28px)은 이미 safe-area 포함 총합이라 별도 처리 없음. 세로 확대분(+3px 수준)이 이 여백을 크게 잠식하지 않는다.

## 컴포넌트 경계

- `src/features/navigation/components/tab-bar.tsx`: pill 컨테이너에 `data-bounce` 토글용 ref와 `activeIndex` 변경 감지 `useEffect`를 추가한다. 그 외 구조는 그대로 둔다.
- `src/app/globals.css`: `--ease-bounce` 토큰(`:root`)과 `@keyframes tab-bar-bounce` + `[data-bounce="true"]` 규칙(탭 슬라이딩 키프레임 근처)을 추가한다.

## 테스트

시각적 모션이라 자동화 테스트 대상은 아니다. 브라우저에서 수동으로 다음을 확인한다.

- 탭을 눌러 이동할 때 슬라이딩과 동시에 바가 커졌다 줄어드는지.
- 같은 탭을 다시 눌러도(활성 탭 재클릭) 바운스가 발생하지 않는지 — `activeIndex`가 바뀌지 않으므로 자연히 트리거되지 않는다.
- 탭을 빠르게 연속으로 눌러도 매번 애니메이션이 처음부터 재생되는지.
- `prefers-reduced-motion: reduce` 환경(브라우저 개발자도구 에뮬레이션)에서 바운스가 사실상 사라지는지.
- 페이지 최초 진입 시 바가 바운스하지 않는지.
- 좁은 화면 폭에서 pill이 옆 여백을 침범하지 않는지.
