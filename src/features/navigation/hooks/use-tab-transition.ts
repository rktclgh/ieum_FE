"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import {
  findTabIndex,
  resolveTabDirection,
  type TabTransitionDirection,
} from "@/features/navigation/lib/tab-transition"

/**
 * `app/template.tsx`는 라우트가 바뀔 때마다 통째로 새로 마운트되므로 이전 탭 인덱스를
 * 컴포넌트 state나 ref에 둘 수 없다(마운트와 함께 초기화된다). 모듈 스코프에 두면
 * 같은 문서 세션 동안 살아남아 라우트 전환을 가로질러 방향을 계산할 수 있다.
 */
let previousTabIndex: number | null = null

/**
 * 탭 간 이동 방향을 알려준다. 애니메이션을 걸지 않아야 할 때는 `null`이다.
 * 판정 규칙은 `lib/tab-transition.ts`에 순수 함수로 있고 테스트가 붙어 있다.
 *
 * 탭이 아닌 경로에서는 `previousTabIndex`를 갱신하지 않는다. `/my → /friends → /my`처럼
 * 하위 화면을 거쳐 돌아왔을 때 마지막으로 머문 탭 기준으로 판정하기 위해서다.
 */
export function useTabTransition(): TabTransitionDirection | null {
  const pathname = usePathname()
  const tabIndex = findTabIndex(pathname)

  // 렌더 중에는 읽기만 한다. 갱신은 아래 effect에서 커밋되므로
  // StrictMode의 이중 렌더에서도 같은 방향이 나온다.
  const direction = resolveTabDirection(previousTabIndex, tabIndex)

  React.useEffect(() => {
    if (tabIndex === -1) return
    previousTabIndex = tabIndex
  }, [tabIndex])

  return direction
}
