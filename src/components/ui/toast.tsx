import * as React from "react"

import { cn } from "@/lib/utils"

interface ToastPillProps {
  children: React.ReactNode
  className?: string
}

/**
 * 토스트 알림의 **시각 요소만** — 어두운 라운드 pill. 위치는 감싸는 쪽이 정한다.
 *
 * 하단 고정이 아닌 자리에도 같은 알림 언어를 쓰려고 분리했다(issue #435: 채팅방 상단의
 * 연결 상태 알림). 색·radius·타이포를 여기 한 곳에서만 정의해, 위치가 다르다는 이유로
 * 알림 모양이 갈라지는 것을 막는다.
 */
function ToastPill({ children, className }: ToastPillProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white",
        className
      )}
    >
      {children}
    </div>
  )
}

interface ToastProps {
  open: boolean
  message: string
  className?: string
}

/**
 * 화면 하단에 잠깐 뜨는 알림 배너. 기준은 문의 제출 피드백이다.
 * 표시 여부와 소멸 타이밍은 호출부가 정한다(stateless).
 */
function Toast({ open, message, className }: ToastProps) {
  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "bottom-anchor-auto app-column fixed inset-x-0 bottom-[calc(6rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))] z-50 flex justify-center px-4",
        className
      )}
    >
      <ToastPill>{message}</ToastPill>
    </div>
  )
}

export { Toast, ToastPill }
