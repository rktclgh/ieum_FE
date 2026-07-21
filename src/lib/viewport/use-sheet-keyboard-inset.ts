"use client"

import * as React from "react"

import { resolveSheetKeyboardInset } from "@/lib/viewport/sheet-keyboard-inset"

const CSS_VARIABLE = "--sheet-keyboard-inset"

/**
 * 바텀시트를 키보드 위로 올린다 — issue #458.
 *
 * ## 왜 전역 `--keyboard-inset`을 쓰지 않는가
 *
 * 전역 인셋(`use-keyboard-inset.ts`)은 "키보드가 가린 높이"를 잰다. 그런데 바텀시트에 필요한
 * 값은 그게 아니다. iOS(resizes-visual — `interactive-widget`은 Chromium 전용이라 iOS에서
 * 무효다, #431)에서 키보드가 뜨면 iOS가 문서를 강제 스크롤해 `position: fixed` 레이어를
 * 통째로 끌어올린다. 즉 시트는 **이미 상당 부분 올라가 있고**, 남은 어긋남만 메우면 된다.
 * 가린 높이를 그대로 더하면 그만큼 과보정된다.
 *
 * ## 무엇을 재는가
 *
 * 딱 하나, **시트 박스 바닥과 가시 영역 바닥의 차이**를 레이아웃 뷰포트 좌표계에서 잰다.
 *
 *   overlap = viewport.getBoundingClientRect().bottom − (visualViewport.offsetTop + height)
 *
 * `getBoundingClientRect()`와 `offsetTop`이 같은 좌표계(레이아웃 뷰포트)라 그대로 뺄 수 있다.
 * 이 값만큼 padding-bottom을 더하면 시트 바닥이 가시 영역 바닥(=키보드 상단선)에 정확히
 * 닿고, 기존 28px 여백이 그 위에 얹힌다.
 *
 * ## 이 공식이 상수에 기대지 않는 이유
 *
 * `docs/viewport-behavior.md`가 기록하듯 이 이음매는 추측 상수로 일곱 번 실패했다. 여기서는
 * 뷰포트 단위도, 62px 같은 기기 상수도, iOS가 얼마나 스크롤했는지에 대한 가정도 쓰지 않고
 * **실제 박스 위치를 그때그때 읽는다.** 그래서 아래가 전부 한 식으로 처리된다.
 *
 *   - standalone(시트가 `height:100lvh`=874에 정렬, globals.css) — ICB 바닥(812)보다 62px
 *     아래라 그만큼 가려진다 → overlap ≈ 62를 재서 메운다. **이번 회귀의 정체다**(#419가
 *     `.bottom-sheet-viewport`에 `height:100lvh`를 넣기 전에는 시트가 ICB 바닥에 정렬돼
 *     iOS 키보드 상단선과 우연히 일치했고, 그래서 회피 코드 없이도 동작하는 것처럼 보였다).
 *   - 사파리 탭(시트가 `fixed inset-0`=ICB 바닥) — iOS가 이미 다 올려놨으면 overlap ≈ 0.
 *   - iOS가 문서를 스크롤하지 못한 경우(이미 보이는 입력창, 스크롤 핀이 0으로 되돌린 경우
 *     등) — overlap이 키보드 높이에 가깝게 커지며 시트를 그만큼 올린다.
 *
 * 순환 참조가 없다: 우리가 바꾸는 건 padding이고 padding은 border box 안쪽이라, 재는 대상인
 * 뷰포트 박스의 bottom은 움직이지 않는다.
 *
 * @returns 시트 Viewport 엘리먼트에 붙일 콜백 ref.
 */
function useSheetKeyboardInset(): (node: HTMLElement | null) => void {
  // 시트는 Portal 안에서 열릴 때만 마운트되므로, ref 객체가 아니라 상태로 받아
  // 엘리먼트가 실제로 붙은 시점에 effect가 다시 돌게 한다.
  const [node, setNode] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!node) return
    const viewport = window.visualViewport
    if (!viewport) return

    const root = document.documentElement
    let rafId: number | null = null

    const applyInset = () => {
      rafId = null

      // 판정·계산은 순수 함수에 있다(sheet-keyboard-inset.ts). #431 실측값으로 테스트가 고정한다.
      const inset = resolveSheetKeyboardInset({
        layoutHeight: root.clientHeight,
        visualHeight: viewport.height,
        visualOffsetTop: viewport.offsetTop,
        scale: viewport.scale,
        sheetBottom: node.getBoundingClientRect().bottom,
      })

      node.style.setProperty(CSS_VARIABLE, `${inset}px`)
    }

    // 키보드 애니메이션 중 이벤트가 고빈도로 쏟아지므로 프레임당 한 번만 쓴다.
    const sync = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(applyInset)
    }

    sync()

    // offsetTop은 문서 스크롤을 따라 움직이므로 resize만으로는 부족하다. scroll도 함께 본다.
    viewport.addEventListener("resize", sync)
    viewport.addEventListener("scroll", sync)
    window.addEventListener("scroll", sync)

    return () => {
      viewport.removeEventListener("resize", sync)
      viewport.removeEventListener("scroll", sync)
      window.removeEventListener("scroll", sync)
      if (rafId !== null) cancelAnimationFrame(rafId)
      node.style.removeProperty(CSS_VARIABLE)
    }
  }, [node])

  return setNode
}

export { useSheetKeyboardInset }
