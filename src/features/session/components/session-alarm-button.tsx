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
      {/* 미읽음 개수는 버튼의 접근가능한 이름에 포함시킨다. 배지는 버튼의 형제라 포커스를 받지 못해,
          배지 안에 sr-only 텍스트를 두면 탭으로 버튼에 온 스크린리더 사용자에게 전달되지 않는다. */}
      <Circle
        iconSrc="/icons/circle/alarm.svg"
        aria-label={
          isLoggedIn
            ? hasUnread
              ? `${messages.notification.bellLabel} ${messages.notification.unreadBadgeLabel(unreadCount)}`
              : messages.notification.bellLabel
            : messages.home.loginLabel
        }
        onClick={() => router.push(isLoggedIn ? routes.notifications() : routes.login())}
      />
      {hasUnread && (
        // 시각적 점 배지는 장식 — 개수는 위 버튼 라벨이 전달하므로 스크린리더에서는 숨긴다.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 size-2.5 rounded-full border-2 border-white bg-primary"
        />
      )}
    </div>
  )
}

export { SessionAlarmButton }
