"use client"

import * as React from "react"

/**
 * 롱프레스로 떠오를 "표면"을 자식에게 알려주는 통로.
 *
 * 리스트 행처럼 눌린 요소 자신이 떠오르는 경우엔 필요 없다. 바텀시트처럼 **메뉴 상태를 가진
 * 자식(카드)** 과 **떠올라야 할 흰 표면(시트 팝업)** 이 다른 컴포넌트일 때, 상태를 위로
 * 올리는 최소한의 통로로 쓴다.
 *
 * 공급자가 없으면 no-op 이라, 같은 컴포넌트를 시트 밖(검색 리스트 등)에서 그대로 재사용할 수 있다.
 *
 * 사용법:
 *   // 표면 쪽
 *   const { lifted, setLifted } = useLiftSurfaceState()
 *   <LiftSurfaceProvider value={setLifted}> ... </LiftSurfaceProvider>
 *   // 눌리는 쪽
 *   const setLifted = useLiftSurface()
 */
type SetLifted = (lifted: boolean) => void

const NOOP: SetLifted = () => {}

const LiftSurfaceContext = React.createContext<SetLifted>(NOOP)

/** 표면이 자기 리프트 상태를 들고 있기 위한 상태 훅. */
function useLiftSurfaceState() {
  const [lifted, setLifted] = React.useState(false)
  return { lifted, setLifted }
}

/**
 * `value` 는 참조가 안정적이어야 한다(useState 의 setter 를 그대로 넘길 것).
 * 렌더마다 새 함수를 넘기면 아래 해제 effect 가 매번 재실행돼 열린 메뉴의 리프트를 꺼버린다.
 */
function LiftSurfaceProvider({
  value,
  children,
}: {
  value: SetLifted
  children: React.ReactNode
}) {
  return <LiftSurfaceContext value={value}>{children}</LiftSurfaceContext>
}

/**
 * 눌린 쪽에서 쓰는 setter.
 *
 * 언마운트 시 자동으로 해제한다 — 캐러셀처럼 표면은 남고 카드만 사라지는 경우
 * 표면이 떠오른 채로 굳는 것을 막는다.
 */
function useLiftSurface(): SetLifted {
  const setLifted = React.useContext(LiftSurfaceContext)

  React.useEffect(() => {
    return () => setLifted(false)
  }, [setLifted])

  return setLifted
}

export { LiftSurfaceProvider, useLiftSurface, useLiftSurfaceState }
