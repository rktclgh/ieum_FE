"use client"

import * as React from "react"
import { create } from "zustand"

/**
 * 화면 전체를 덮는 오버레이(풀스크린 오버레이·바텀시트)가 몇 개 열려 있는지 센다.
 *
 * 하단 탭바처럼 라우트 단위로만 노출을 판정하는 전역 크롬이, 라우트는 그대로인 채
 * 화면만 바뀌는 상황(예: 홈 `/` 위의 검색·새 모임 작성 오버레이)을 알아채기 위한 통로다.
 * z-index로 덮는 것만으로는 부족하다 — 오버레이 진입·퇴장 모션 중, 키보드가 올라와
 * 오버레이 박스가 줄어들 때(`--keyboard-inset`), 반투명 backdrop 뒤로 그대로 비친다.
 *
 * boolean이 아니라 카운터인 이유: 오버레이는 중첩된다(새 모임 작성 위에 장소 선택).
 * 안쪽 하나가 닫혔다고 바깥이 열려 있는데 탭바가 돌아오면 안 된다.
 */
interface ScreenOverlayState {
  openCount: number
  push: () => void
  pop: () => void
}

const useScreenOverlayStore = create<ScreenOverlayState>()((set) => ({
  openCount: 0,
  push: () => set((state) => ({ openCount: state.openCount + 1 })),
  // 언마운트 순서가 꼬여도 음수로 내려가 다음 오버레이를 무효화하지 않도록 바닥을 둔다.
  pop: () => set((state) => ({ openCount: Math.max(0, state.openCount - 1) })),
}))

/** 화면을 덮는 오버레이가 하나라도 열려 있는지. 전역 크롬의 노출 판정에 쓴다. */
function useHasScreenOverlay(): boolean {
  return useScreenOverlayStore((state) => state.openCount > 0)
}

/**
 * 마운트되어 있는 동안 자신을 "열린 오버레이"로 등록한다.
 * 등록 수명이 곧 노출 수명이므로, 퇴장 모션이 끝나 언마운트될 때까지 유지되어야 한다.
 */
function useRegisterScreenOverlay(): void {
  React.useEffect(() => {
    const { push, pop } = useScreenOverlayStore.getState()
    push()
    return pop
  }, [])
}

/**
 * 훅을 부를 자리가 없는 곳(조건부로만 마운트되는 Portal 안쪽 등)에서 쓰는 등록 전용 노드.
 * 렌더 결과가 없으므로 어디에 끼워 넣어도 레이아웃에 영향이 없다.
 */
function ScreenOverlayMarker(): null {
  useRegisterScreenOverlay()
  return null
}

export { ScreenOverlayMarker, useHasScreenOverlay, useRegisterScreenOverlay }
