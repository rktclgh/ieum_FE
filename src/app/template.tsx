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

  /*
   * 바깥 래퍼의 `overflow-x-clip`은 장식이 아니다 — issue #376.
   *
   * forward 키프레임은 들어오는 화면을 `translate3d(2rem, 0, 0)`에서 시작시킨다. 이때
   * 이 요소가 뷰포트 오른쪽으로 2rem 삐져나가고, **오른쪽(inline-end) 오버플로는 브라우저가
   * 스크롤 가능 영역으로 만든다.** 반대로 backward는 왼쪽으로 나가는데 왼쪽(inline-start)
   * 오버플로는 그냥 잘려서 스크롤 영역이 생기지 않는다. 그래서 좌→우 이동에서만 애니메이션
   * 동안 문서가 32px 넓어졌다 돌아온다(실측 확인).
   *
   * 자기 자신의 overflow로는 막을 수 없다(요소의 박스가 부모를 넘치는 것이라서). 부모에서
   * 잘라야 한다. `hidden`이 아니라 `clip`인 이유는 스크롤 컨테이너를 만들지 않기 위해서다 —
   * `overflow-x: clip`은 세로 `visible`과 짝지어 쓸 수 있어 페이지 스크롤 동작을 건드리지 않는다.
   *
   * 안쪽 div에 붙은 `data-tab-transition`은 애니메이션이 없을 때 속성 자체를 떼어,
   * CSS 규칙이 아예 매칭되지 않게 한다.
   */
  return (
    <div className="overflow-x-clip">
      <div data-tab-transition={direction ?? undefined}>{children}</div>
    </div>
  )
}
