import { cn } from "@/lib/utils"

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
        "app-column fixed inset-x-0 bottom-[calc(6rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))] z-50 flex justify-center px-4",
        className
      )}
    >
      <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
        {message}
      </div>
    </div>
  )
}

export { Toast }
