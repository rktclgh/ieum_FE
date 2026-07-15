import { resolveNotificationRoute } from "@/features/notification/lib/notification-link"
import type { NotificationItem } from "@/features/notification/api/notification-types"

// UI(NotificationItem 컴포넌트)가 쓰는 뷰 모델. 딥링크 경로는 여기서 미리 계산한다.
// 상대시각(createdAt)은 i18n 문구가 필요해 컴포넌트에서 formatRelativeTime 으로 처리한다.
interface NotificationEntry {
  notificationId: number
  type: string
  title: string
  body: string
  isRead: boolean
  isAiAnswer: boolean
  createdAt: string
  href: string | null
}

function adaptNotification(item: NotificationItem): NotificationEntry {
  return {
    notificationId: item.notificationId,
    type: item.type,
    title: item.title,
    body: item.body,
    isRead: item.isRead,
    isAiAnswer: item.answerIsAi,
    createdAt: item.createdAt,
    href: resolveNotificationRoute(item.type, item.refId),
  }
}

export { adaptNotification }
export type { NotificationEntry }
