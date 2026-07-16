"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { notificationStreamUrl } from "@/features/notification/api/notification-api"
import { notificationKeys } from "@/features/notification/hooks/use-notification-queries"

// SSE 로 새 알림을 실시간 수신한다. 이벤트가 오면 목록/미읽음 수를 무효화해 최신화한다.
// EventSource 는 same-origin 쿠키(access_token)를 자동 전송하고, 끊기면 자동 재연결한다.
// enabled 는 보통 로그인 여부 — 로그아웃 상태에서 연결이 401 로 무한 재시도되는 것을 막는다.
function useNotificationSse(enabled: boolean) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof EventSource === "undefined") {
      return
    }

    const source = new EventSource(notificationStreamUrl(), { withCredentials: true })
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })

    // 서버 이벤트 이름이 확정 전이라 기본 message 와 명시적 notification 이벤트를 모두 구독한다.
    source.onmessage = invalidate
    source.addEventListener("notification", invalidate)

    source.onerror = () => {
      // 브라우저가 자동 재연결하지만, 영구 종료(로그아웃 등)면 닫아 재시도 폭주를 막는다.
      if (source.readyState === EventSource.CLOSED) source.close()
    }

    return () => source.close()
  }, [enabled, queryClient])
}

export { useNotificationSse }
