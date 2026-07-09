"use client"

import * as React from "react"

const SCROLL_HIDE_DELAY = 500

/** 스크롤 중일 때만 스크롤바가 나타나고, 멈추면 500ms 후 사라지는 페이드 스크롤바 (국가 선택 drawer 등에서 사용) */
const FADE_SCROLLBAR_CLASSNAME =
  "[scrollbar-width:thin] [scrollbar-color:transparent_transparent] data-[scrolling=true]:[scrollbar-color:rgba(0,0,0,0.2)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-100 data-[scrolling=true]:[&::-webkit-scrollbar-thumb]:bg-black/20"

function useFadeScrollbar() {
  const [isScrolling, setIsScrolling] = React.useState(false)
  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const onScroll = () => {
    setIsScrolling(true)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    hideTimeoutRef.current = setTimeout(() => setIsScrolling(false), SCROLL_HIDE_DELAY)
  }

  React.useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    },
    []
  )

  return { isScrolling, onScroll }
}

export { useFadeScrollbar, FADE_SCROLLBAR_CLASSNAME }
