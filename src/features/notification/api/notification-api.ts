import { apiClient } from "@/lib/api/client"
import { DEV_BACKEND_ORIGIN } from "@/lib/runtime/dev-backend-origin"

import type { NotificationsPage } from "@/features/notification/api/notification-types"

// 조회 (CSRF 불필요) — apiClient 가 withCredentials/CSRF/401 refresh 를 자동 처리한다.

// 알림 목록 — 커서 페이지네이션(size 기본 20). nextCursor 가 null 이면 마지막 페이지.
async function getNotifications(params: { cursor?: string | null; size?: number }) {
  const { data } = await apiClient.get<NotificationsPage>("/api/v1/notifications", {
    params: {
      cursor: params.cursor ?? undefined,
      size: params.size ?? 20,
    },
  })
  return data
}

// 상태 변경 (CSRF 필요).

// 단건 읽음 처리 — 204.
async function readNotification(notificationId: number) {
  await apiClient.post(`/api/v1/notifications/${notificationId}/read`)
}

// 단건 삭제 — 204.
async function deleteNotification(notificationId: number) {
  await apiClient.delete(`/api/v1/notifications/${notificationId}`)
}

// SSE 구독 URL. 브라우저 EventSource 가 쿠키(access_token)를 자동 전송한다.
// 프로덕션은 same-origin 상대경로면 되고, 로컬 dev 는 FE/BE origin 이 달라
// apiClient·파일 URL 과 동일하게 DEV_BACKEND_ORIGIN 을 prefix 한다(withCredentials 로 쿠키 실림).
function notificationStreamUrl(): string {
  const path = "/api/v1/sse/subscribe"
  return DEV_BACKEND_ORIGIN ? `${DEV_BACKEND_ORIGIN}${path}` : path
}

export {
  getNotifications,
  readNotification,
  deleteNotification,
  notificationStreamUrl,
}
