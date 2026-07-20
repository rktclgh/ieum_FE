"use client"

import * as React from "react"

/**
 * 진입 모션이 있는 오버레이 안의 입력창에 키보드를 확실히 띄우기 위한 장치 (issue #384).
 *
 * 두 제약이 정면으로 부딪힌다.
 * 1. iOS는 **사용자 제스처 핸들러 안에서** 일어난 `focus()`에만 키보드를 띄운다.
 *    모션이 끝난 뒤(transitionend) 포커스를 주면 제스처 밖이라 키보드가 안 뜬다.
 * 2. 그렇다고 마운트 시점에 포커스를 주면(=`autoFocus`), 그때 오버레이는 아직 화면
 *    아래(`translate-y-full`)라 브라우저가 입력창을 보이게 하려고 뷰포트를 키보드
 *    높이만큼 밀어 올리고, 그 오프셋이 모션 후에도 남는다 — 원래 잡으려던 버그.
 *
 * 프라이머는 이 둘을 분리한다. 탭 핸들러(=제스처 안)에서 **애니메이션되지 않는**
 * 숨은 input에 먼저 포커스해 키보드를 띄우고(1 충족), 실제 입력창은 오버레이가
 * 제자리에 온 뒤에 포커스를 넘겨받는다(2 충족, `useFocusOnOverlaySettled`).
 * 키보드가 이미 떠 있는 상태에서의 포커스 이동은 제스처가 없어도 허용되므로
 * 키보드가 닫히지 않는다.
 *
 * input을 React 트리 대신 body에 직접 붙이는 이유:
 * - transform이 걸린 조상(오버레이·탭 전환 애니메이션) 안에 있으면 프라이머 자신이
 *   화면 밖으로 밀려 같은 스크롤 문제를 되풀이한다. body 직속이어야 안전하다.
 * - 제스처 안에서만 필요하므로 SSR·하이드레이션 경로에 등장할 이유가 없다.
 */
function useKeyboardPrimer() {
  const nodeRef = React.useRef<HTMLInputElement | null>(null)

  // 화면을 떠날 때 body에 남기지 않는다.
  React.useEffect(
    () => () => {
      nodeRef.current?.remove()
      nodeRef.current = null
    },
    []
  )

  /** 오버레이를 여는 탭 핸들러 안에서 동기적으로 호출해야 한다(제스처 밖이면 의미가 없다). */
  const prime = React.useCallback(() => {
    let node = nodeRef.current

    if (!node) {
      node = document.createElement("input")
      // 보조기술·탭 순서에서 완전히 빼고 프로그래매틱 포커스만 받는다.
      // 실제 검색 입력창이 따로 있으므로 이 요소가 스크린리더에 노출될 이유는 없다.
      node.setAttribute("aria-hidden", "true")
      node.tabIndex = -1
      // iOS가 자동완성·받아쓰기 액세서리를 붙이지 않게 해 키보드 높이 변동을 줄인다.
      node.setAttribute("autocomplete", "off")
      node.setAttribute("autocorrect", "off")
      node.setAttribute("autocapitalize", "off")
      node.spellcheck = false
      // display:none·visibility:hidden은 포커스가 불가능해 키보드를 띄우지 못한다.
      // 화면 최상단(=키보드가 가리지 않는 위치)에 1px로 두고 투명하게만 만든다.
      node.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none;"
      document.body.appendChild(node)
      nodeRef.current = node
    }

    // 이미 화면 최상단이라 스크롤할 이유가 없지만, 브라우저의 scroll-into-view 휴리스틱
    // 자체를 끄기 위해 명시한다.
    node.focus({ preventScroll: true })
  }, [])

  return { prime }
}

export { useKeyboardPrimer }
