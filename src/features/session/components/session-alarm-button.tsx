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
  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount)

  return (
    <div className="relative shrink-0">
      <Circle
        iconSrc="/icons/circle/alarm.svg"
        aria-label={isLoggedIn ? messages.notification.bellLabel : messages.home.loginLabel}
        onClick={() => router.push(isLoggedIn ? routes.notifications() : routes.login())}
      />
      {hasUnread && (
        <span
          aria-label={messages.notification.unreadBadgeLabel(unreadCount)}
          className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[11px] font-semibold leading-none text-white"
        >
          {badgeText}
        </span>
      )}
    </div>
  )
}

export { SessionAlarmButton }
