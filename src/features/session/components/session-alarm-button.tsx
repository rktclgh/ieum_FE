"use client"

import { useRouter } from "next/navigation"

import { Circle } from "@/components/ui/circle"
import { useMe } from "@/features/session/hooks/use-me"
import { useUnreadCount } from "@/features/notification/hooks/use-notification-queries"
import { useAppSse } from "@/features/session/hooks/use-app-sse"
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
  useAppSse(isLoggedIn)

  const hasUnread = isLoggedIn && unreadCount > 0

  return (
    <div className="shrink-0">
      {/* 미읽음 점 배지는 CSS가 아니라 아이콘 자체(alarm-on.svg)로 그린다 — 종 모양과 점의 상대 위치를
          디자인 원본 그대로 유지하기 위함. 개수는 버튼의 접근가능한 이름으로 전달한다. */}
      <Circle
        iconSrc={hasUnread ? "/icons/circle/alarm-on.svg" : "/icons/circle/alarm.svg"}
        aria-label={
          isLoggedIn
            ? hasUnread
              ? `${messages.notification.bellLabel} ${messages.notification.unreadBadgeLabel(unreadCount)}`
              : messages.notification.bellLabel
            : messages.home.loginLabel
        }
        onClick={() => router.push(isLoggedIn ? routes.notifications() : routes.login())}
      />
    </div>
  )
}

export { SessionAlarmButton }
