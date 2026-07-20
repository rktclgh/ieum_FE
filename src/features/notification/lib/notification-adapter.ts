import { resolveNotificationRoute } from "@/features/notification/lib/notification-link"
import type { NotificationItem } from "@/features/notification/api/notification-types"
import {
  hasRequiredNotificationMessageParams,
  isNotificationMessageKey,
} from "@/lib/i18n/notification-message-keys"
import type { Messages } from "@/lib/i18n/messages/ko"

// UI(NotificationItem 컴포넌트)가 쓰는 뷰 모델. 딥링크 경로는 여기서 미리 계산한다.
// 상대시각(createdAt)은 i18n 문구가 필요해 컴포넌트에서 formatRelativeTime 으로 처리한다.
interface NotificationEntry {
  notificationId: number
  type: string
  title: string
  body: string
  isRead: boolean
  isAiAnswer: boolean | null
  createdAt: string
  href: string | null
}

// 서버는 문장이 아니라 키를 보낸다. 문구는 여기서 사용자 언어로 해석한다(백엔드 이슈 #193).
//
// 폴백이 두 겹인 이유:
//   1. messageKey 가 null   → v36 이전에 쌓인 알림. 서버가 구운 한국어 title/body 를 쓴다.
//   2. 카탈로그에 키가 없음 → 서버가 카탈로그보다 먼저 배포된 경우. 역시 서버 문구로 버틴다.
// 어느 쪽이든 빈 알림을 보여주는 것보다 한국어라도 보여주는 편이 낫다.
function resolveCopy(item: NotificationItem, messages: Messages): { title: string; body: string } {
  const fallback = { title: item.title, body: item.body }

  if (item.messageKey === null || !isNotificationMessageKey(item.messageKey)) {
    return fallback
  }

  if (!hasRequiredNotificationMessageParams(item.messageKey, item.messageParams)) {
    return fallback
  }

  const copy = messages.notification.copy[item.messageKey]
  if (!copy) {
    return fallback
  }

  return { title: copy.title, body: copy.body(item.messageParams ?? {}) }
}

function adaptNotification(item: NotificationItem, messages: Messages): NotificationEntry {
  const copy = resolveCopy(item, messages)

  return {
    notificationId: item.notificationId,
    type: item.type,
    title: copy.title,
    body: copy.body,
    isRead: item.isRead,
    isAiAnswer: item.answerIsAi,
    createdAt: item.createdAt,
    href: resolveNotificationRoute(item.type, item.refId),
  }
}

export { adaptNotification }
export type { NotificationEntry }
