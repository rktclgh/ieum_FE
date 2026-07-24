# 하단 탭 바 컨테이너 바운스 효과 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 탭 전환 시 슬라이딩 인디케이터와 동시에 탭 바 컨테이너(pill)가 살짝 확대되었다가 인디케이터 도착 시점에 원래 크기로 줄어드는 바운스 효과를 추가한다.

**Architecture:** 순수 CSS `@keyframes` 애니메이션(`tab-bar-bounce`) + 속성 셀렉터(`[data-bounce="true"]`)로 구현한다. `TabBarNav`는 라우트가 바뀌어도 언마운트되지 않는 단일 인스턴스라, `activeIndex` 변경을 감지하는 `useEffect`가 매번 pill 컨테이너의 `data-bounce` 속성을 제거→강제 reflow→재부착해서 CSS 애니메이션을 강제로 재시작시킨다.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4 (`@theme` 토큰), 순수 CSS `@keyframes` — 새 의존성 없음.

## Global Constraints

- 모든 폴더/파일명은 소문자 kebab-case (feedback_folder_naming_convention).
- 새 하드코딩 한글 UI 문자열 금지 — 이 작업은 UI 텍스트를 추가하지 않으므로 해당 없음.
- 커밋 메시지에 `Co-Authored-By: Claude` 트레일러 금지.
- push 전 `pnpm build` 클린 통과 확인 (npm 아님 — 저장소는 pnpm-lock.yaml 사용).
- 브랜치는 이미 `feat/#496`으로 생성되어 워크트리 `/Users/jihye/ieum_FE/.claude/worktrees/feat-496`에 체크아웃되어 있다 — 모든 작업은 이 디렉토리에서 수행한다.
- 애니메이션 duration은 `--motion-duration-base`(300ms)를 그대로 참조해 슬라이딩과 동기화한다. 새 duration 토큰을 만들지 않는다.
- `prefers-reduced-motion: reduce`는 기존 `--motion-duration-base: 0.01ms` 재정의 메커니즘에 얹혀가므로, 이 작업에서 별도의 reduced-motion 처리 코드를 추가하지 않는다.

---

## Task 1: 탭 바 바운스 애니메이션 추가

**Files:**
- Modify: `src/app/globals.css:184` 부근 (`--ease-bounce` 토큰 추가)
- Modify: `src/app/globals.css:508` 부근 (`@keyframes tab-bar-bounce` + `[data-bounce="true"]` 규칙 추가)
- Modify: `src/features/navigation/components/tab-bar.tsx:107-127` (pill 컨테이너에 ref + `data-bounce` 트리거 로직 추가)

**Interfaces:**
- Consumes: 없음 (기존 `activeIndex` prop, 기존 `--motion-duration-base` 토큰만 사용)
- Produces: CSS 토큰 `--ease-bounce`, CSS 클래스/속성 `[data-bounce="true"]` — 이후 다른 작업에서 참조할 계획 없음(이 작업이 유일한 소비처)

- [ ] **Step 1: `--ease-bounce` 토큰 추가**

`src/app/globals.css`의 `:root` 블록에서 `--motion-duration-keyboard: 250ms;` (184번째 줄) 바로 다음 줄에 추가한다:

```css
  --motion-duration-keyboard: 250ms;

  /*
   * 탭 바 바운스 전용 — issue #496. #280 단일 기준(ease-base)의 의도적 예외다.
   * ease-base보다 급격하게 감속해 "튕기는" 인상을 준다. 목표치를 넘어서는
   * 오버슈트는 없다 — 단순 확대→축소 펄스이지 스프링 반동이 아니다.
   * 다른 용도로 가져다 쓰기 전에: 이 바운스 펄스와 같은 성격의 모션인지 먼저 확인할 것.
   * 그게 아니면 `--ease-base`가 맞다.
   */
  --ease-bounce: cubic-bezier(0.22, 1, 0.36, 1);
```

- [ ] **Step 2: `@keyframes tab-bar-bounce` + 트리거 규칙 추가**

같은 파일에서 기존 `[data-tab-transition="backward"] { ... }` 규칙(515~520번째 줄) 바로 다음, `prefers-reduced-motion` 블록(530번째 줄) 전에 추가한다:

```css
/*
 * 탭 바 컨테이너 바운스 — issue #496.
 * 활성 pill 슬라이딩과 동시에 바 컨테이너 자체가 확대→축소되는 펄스.
 * duration은 슬라이딩과 같은 `--motion-duration-base`를 참조하므로 아래
 * reduced-motion 블록 하나로 함께 무력화된다.
 */
@keyframes tab-bar-bounce {
  0%,
  100% {
    transform: scale(1);
  }
  20%,
  80% {
    transform: scale(1.05);
  }
}

/*
 * `tab-bar.tsx`가 activeIndex 변경 시 속성을 제거→reflow→재부착해서
 * 애니메이션을 강제로 재시작시킨다 (컨테이너가 언마운트되지 않는 단일
 * 인스턴스라 속성값만 다시 세팅해서는 애니메이션이 재생되지 않는다).
 */
[data-bounce="true"] {
  animation: tab-bar-bounce var(--motion-duration-base) var(--ease-bounce);
}
```

- [ ] **Step 3: pill 컨테이너에 ref와 바운스 트리거 `useEffect` 추가**

`src/features/navigation/components/tab-bar.tsx`를 연다. 먼저 최상단 import에 `useRef`, `useEffect`가 이미 `React` 네임스페이스로 들어와 있는지 확인한다 — 이 파일은 `import * as React from "react"`를 쓰므로 `React.useRef`, `React.useEffect`로 접근한다.

`TabBarNav` 함수 본문(현재 78번째 줄 `function TabBarNav({...}) {` 바로 다음, `const { messages } = useTranslation()` 위)에 다음을 추가한다:

```tsx
function TabBarNav({
  activeIndex,
  concealed = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { activeIndex: number; concealed?: boolean }) {
  const pillContainerRef = React.useRef<HTMLDivElement>(null)
  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const el = pillContainerRef.current
    if (!el) return
    el.removeAttribute("data-bounce")
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- 강제 reflow로 애니메이션 재시작
    el.offsetWidth
    el.setAttribute("data-bounce", "true")
  }, [activeIndex])

  const { messages } = useTranslation()
```

다음으로, pill 컨테이너 div(현재 107~110번째 줄)에 `ref`를 연결한다. 기존:

```tsx
      <div
        className="relative flex w-full items-center justify-between overflow-hidden rounded-full shadow-[0px_2px_16px_0px_rgba(0,0,0,0.12)] backdrop-blur-[3px]"
        style={{ padding: CONTAINER_PADDING }}
      >
```

수정 후:

```tsx
      <div
        ref={pillContainerRef}
        className="relative flex w-full items-center justify-between overflow-hidden rounded-full shadow-[0px_2px_16px_0px_rgba(0,0,0,0.12)] backdrop-blur-[3px]"
        style={{ padding: CONTAINER_PADDING }}
      >
```

- [ ] **Step 4: 타입체크·린트 통과 확인**

Run: `cd /Users/jihye/ieum_FE/.claude/worktrees/feat-496 && pnpm typecheck && pnpm lint`

Expected: 두 명령 모두 에러 없이 통과. (프로젝트에 `typecheck`/`lint` 스크립트가 없다면 `package.json`의 `scripts`를 확인해 해당하는 명령으로 대체한다 — 예: `pnpm tsc --noEmit`, `pnpm eslint .`)

- [ ] **Step 5: 개발 서버에서 수동 검증**

Run: `cd /Users/jihye/ieum_FE/.claude/worktrees/feat-496 && pnpm dev`

브라우저에서 로그인 후 탭이 있는 화면(홈 등)으로 이동해 다음을 확인한다:

1. 다른 탭을 누르면 슬라이딩 인디케이터와 동시에 바 전체가 살짝 커졌다가 인디케이터가 도착하는 순간 원래 크기로 줄어든다.
2. 이미 활성화된 탭을 다시 눌러도(탭 재클릭) 바운스가 발생하지 않는다.
3. 탭을 빠르게 연속으로 눌러도 매번 애니메이션이 처음부터 다시 재생된다(중간에 끊기거나 누적되지 않는다).
4. 페이지 최초 진입 시(새로고침 직후) 바가 바운스하지 않는다.
5. 크롬 개발자도구에서 렌더링 → "Emulate CSS prefers-reduced-motion: reduce"를 켠 상태로 탭을 전환하면 바운스가 사실상 사라진다(즉시 전환).
6. 좁은 화면 폭(예: 개발자도구 기기 툴바에서 iPhone SE 375px 또는 더 좁은 320px)에서 확대 시 pill이 옆 여백을 침범하거나 잘리지 않는다.

Expected: 6개 항목 모두 통과. 하나라도 어긋나면 Step 1~3으로 돌아가 원인을 찾는다 — 예를 들어 (2)가 실패하면(재클릭 시에도 바운스가 발생하면) `Link`의 `href`가 현재 경로와 같아도 Next.js가 리렌더를 유발하는지 확인하고, `activeIndex` 값 자체가 바뀌지 않는지 `console.log`로 확인한다.

- [ ] **Step 6: 빌드 확인**

Run: `cd /Users/jihye/ieum_FE/.claude/worktrees/feat-496 && pnpm build`

Expected: 클린 빌드 성공 (에러 없음).

- [ ] **Step 7: 커밋**

```bash
cd /Users/jihye/ieum_FE/.claude/worktrees/feat-496
git add src/app/globals.css src/features/navigation/components/tab-bar.tsx
git commit -m "$(cat <<'EOF'
feat: 탭 바 전환 시 컨테이너 바운스 효과 추가

슬라이딩 인디케이터와 동시에 탭 바 컨테이너가 확대→축소되는 펄스를
추가해 전환에 탄력있는 피드백을 준다. duration은 --motion-duration-base를
공유해 슬라이딩과 동기화된다.
EOF
)"
```

---

## Self-Review

- **Spec coverage:** 애니메이션 사양(4단 키프레임) → Step 2. 새 예외 토큰(`--ease-bounce`) → Step 1. 트리거·재시작 처리(제거→reflow→재부착, 최초 마운트 스킵) → Step 3. 레이아웃 위험 요소(좁은 화면 여백, FAB 겹침, reduced-motion) → Step 5의 수동 검증 항목 4·5·6. 테스트 섹션의 6개 수동 확인 항목 전부 Step 5에 반영됨. 갭 없음.
- **Placeholder scan:** "TBD"/"적절히 처리" 류 문구 없음. 모든 코드 스텝에 실제 코드 포함.
- **Type consistency:** `pillContainerRef`(`React.useRef<HTMLDivElement>`)와 `ref={pillContainerRef}` 연결 대상이 `<div>` 요소로 일치. `data-bounce` 속성명이 CSS 셀렉터(`[data-bounce="true"]`)와 JS(`setAttribute("data-bounce", "true")`, `removeAttribute("data-bounce")`) 양쪽에서 동일.
