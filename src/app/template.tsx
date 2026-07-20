"use client"

import { useTabTransition } from "@/features/navigation/hooks/use-tab-transition"

/**
 * 탭 전환 슬라이딩 — issue #303.
 *
 * `template.tsx`는 `layout.tsx`와 달리 라우트가 바뀔 때마다 새 인스턴스로 마운트된다.
 * 그래서 "새 화면이 들어오는" 애니메이션의 훅으로 쓸 수 있다. 반대로 탭바는 계속
 * 살아 있어야 pill이 미끄러지므로(issue #280) layout에 그대로 둔다 — 여기서 감싸지 않는다.
 *
 * 나가는 화면은 애니메이션하지 않는다. App Router에서 이전 화면 트리는 새 화면이
 * 커밋되는 순간 사라지고, 이를 붙잡아 두려면 DOM 스냅샷을 떠야 하는데 홈 탭의 지도는
 * WebGL 캔버스라 복제하면 빈 화면으로 찍힌다. 그래서 들어오는 화면만 방향에 맞춰
 * 짧게 밀어 넣고 페이드인한다(자세한 배경은 이슈 참고).
 *
 * children은 prop으로 내려오므로 이 파일이 클라이언트 컴포넌트여도
 * 각 페이지는 서버 컴포넌트로 그대로 렌더된다.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const direction = useTabTransition()

  // 애니메이션이 없을 땐 속성 자체를 붙이지 않아 CSS 규칙이 아예 매칭되지 않게 한다.
  return <div data-tab-transition={direction ?? undefined}>{children}</div>
}
