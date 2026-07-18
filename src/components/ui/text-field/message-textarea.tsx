"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useCoarsePointer } from "@/lib/hooks/use-coarse-pointer"

interface MessageTextareaProps extends Omit<React.ComponentProps<"textarea">, "rows"> {
  /** 내용에 따라 늘어날 수 있는 최대 줄 수. 이 높이를 넘으면 내부 스크롤로 전환한다. */
  maxRows?: number
  /** Enter(데스크톱) 또는 전송 버튼으로 전송할 때. 줄바꿈으로 해석된 Enter에서는 호출되지 않는다. */
  onSubmit?: () => void
}

/**
 * 메시지 컴포저용 한 줄에서 시작해 자동으로 늘어나는 textarea.
 *
 * Enter 정책은 기기에 따라 다르다. 모바일 가상 키보드에는 Shift+Enter가 없어서
 * 데스크톱 관습(Enter=전송, Shift+Enter=줄바꿈)을 그대로 쓸 수 없기 때문이다.
 * - 터치 기기: Enter = 줄바꿈, 전송은 전송 버튼만 (카카오톡/왓츠앱과 동일)
 * - 데스크톱: Enter = 전송, Shift+Enter = 줄바꿈
 */
function MessageTextarea({
  className,
  maxRows = 3,
  onSubmit,
  onKeyDown,
  value,
  ref,
  ...props
}: MessageTextareaProps) {
  const innerRef = React.useRef<HTMLTextAreaElement>(null)
  const isCoarse = useCoarsePointer()

  React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)

  React.useLayoutEffect(() => {
    const element = innerRef.current
    if (!element) return

    const style = window.getComputedStyle(element)
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4
    // box-sizing이 border-box라 height는 테두리를 포함하는데 scrollHeight는 콘텐츠 + 패딩까지만
    // 센다. 그래서 재는 쪽(scrollHeight)과 정하는 쪽(maxHeight) 모두에 테두리를 더해야 한다.
    // 지금 consumer들은 테두리가 없어 0이지만, 공용 프리미티브라 테두리가 붙는 순간 어긋난다.
    const borderHeight = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const maxHeight =
      lineHeight * maxRows + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + borderHeight

    // 줄어드는 경우까지 재려면 먼저 높이를 풀어 scrollHeight를 다시 측정해야 한다.
    element.style.height = "auto"
    const contentHeight = element.scrollHeight + borderHeight
    element.style.height = `${Math.min(contentHeight, maxHeight)}px`
    element.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden"
  }, [value, maxRows])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key !== "Enter") return
    // 한글/일본어/중국어 IME 조합 중의 Enter는 글자 확정이므로 건드리지 않는다.
    if (event.nativeEvent.isComposing) return
    // Shift+Enter는 어디서든 줄바꿈. 터치 기기는 Shift가 없으니 Enter 자체가 줄바꿈이다.
    if (event.shiftKey || isCoarse) return

    event.preventDefault()
    onSubmit?.()
  }

  return (
    <textarea
      ref={innerRef}
      rows={1}
      value={value}
      onKeyDown={handleKeyDown}
      enterKeyHint={isCoarse ? "enter" : "send"}
      className={cn(
        "min-w-0 flex-1 resize-none bg-transparent text-body-regular-14 text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

export { MessageTextarea }
