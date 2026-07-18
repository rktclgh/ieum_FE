// 백엔드 알림센터 API 응답 타입 (api-endpoints.md §11).
// type 은 서버가 내려주는 문자열 그대로 보관하고, 딥링크 매핑은 lib/notification-link 에서 처리한다.

interface NotificationItem {
  notificationId: number
  type: string
  title: string
  body: string
  // 딥링크 대상 식별자(질문/모임/채팅). 대상이 없으면 null.
  refId: number | null
  // 답변 알림의 출처. 답변과 무관한 알림이면 null.
  answerIsAi: boolean | null
  isRead: boolean
  createdAt: string
}

// 커서 페이지네이션 응답. nextCursor 가 null 이면 마지막 페이지.
// unreadCount 는 페이지와 무관한 전체 미읽음 수(배지용).
interface NotificationsPage {
  items: NotificationItem[]
  nextCursor: string | null
  unreadCount: number
}


export type { NotificationItem, NotificationsPage }
