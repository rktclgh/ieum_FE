"use client"

import { useRouter } from "next/navigation"

import { Circle } from "@/components/ui/circle"
import { useMe } from "@/features/session/hooks/use-me"
import { useUnreadCount } from "@/features/notification/hooks/use-notification-queries"
import { useNotificationSse } from "@/features/notification/hooks/use-notification-sse"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

// 홈 헤더의 종 버튼 = 알림센터 진입. 로그인 상태면 미읽음 배지를 띄우고 /notifications 로,
// 비로그인 상태면 로그인 화면으로 보낸다(알림은 로그인 필요). 로그아웃은 마이 페이지로 이관됨.
function SessionAlarmButton() {
  const router = useRouter()
  const { messages } = useTranslation()
  const { data } = useMe()
  const isLoggedIn = Boolean(data)

  // 배지 미읽음 수 + 홈에서도 실시간으로 갱신되도록 SSE 구독(로그인 상태에서만).
  const { data: unreadCount = 0 } = useUnreadCount(isLoggedIn)
  useNotificationSse(isLoggedIn)

  const hasUnread = isLoggedIn && unreadCount > 0

  return (
    <div className="relative shrink-0">
      <Circle
        iconSrc="/icons/circle/alarm.svg"
        aria-label={isLoggedIn ? messages.notification.bellLabel : messages.home.loginLabel}
        onClick={() => router.push(isLoggedIn ? routes.notifications() : routes.login())}
      />
      {hasUnread && (
        // 미읽음 표시는 개수(숫자)가 아니라 점(dot) 하나. 개수는 sr-only 자식으로 스크린리더에 전달한다
        // (generic span의 aria-label은 일부 스크린리더가 무시할 수 있어 텍스트 노드로 노출).
        <span className="pointer-events-none absolute right-2 top-2 size-2.5 rounded-full border-2 border-white bg-primary">
          <span className="sr-only">{messages.notification.unreadBadgeLabel(unreadCount)}</span>
        </span>
      )}
    </div>
  )
}

export { SessionAlarmButton }
