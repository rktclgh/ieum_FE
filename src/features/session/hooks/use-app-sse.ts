"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { applyFriendPresence } from "@/features/friends/hooks/use-friends-queries"
import { parseFriendPresenceEvent } from "@/features/friends/lib/friend-presence"
import { notificationStreamUrl } from "@/features/notification/api/notification-api"
import { notificationKeys } from "@/features/notification/hooks/use-notification-queries"

// 앱 전역 SSE 스트림. 서버가 연결 하나로 알림과 친구 접속 상태를 함께 내려주므로
// 세션 계층이 연결을 소유하고, 캐시 갱신은 각 도메인이 제공한 함수에 위임한다.
// EventSource 는 same-origin 쿠키(access_token)를 자동 전송하고, 끊기면 자동 재연결한다.
// enabled 는 보통 로그인 여부 — 로그아웃 상태에서 연결이 401 로 무한 재시도되는 것을 막는다.
function useAppSse(enabled: boolean) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof EventSource === "undefined") {
      return
    }

    const source = new EventSource(notificationStreamUrl(), { withCredentials: true })
    const invalidateNotifications = () =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })

    // 서버 이벤트 이름이 확정 전이라 기본 message 와 명시적 notification 이벤트를 모두 구독한다.
    source.onmessage = invalidateNotifications
    source.addEventListener("notification", invalidateNotifications)

    // presence 는 BE #208 에서 추가된다. 아직 안 오면 이 핸들러는 그냥 호출되지 않는다.
    source.addEventListener("presence", (event) => {
      const presence = parseFriendPresenceEvent((event as MessageEvent<string>).data)
      if (presence) applyFriendPresence(queryClient, presence)
    })

    source.onerror = () => {
      // 브라우저가 자동 재연결하지만, 영구 종료(로그아웃 등)면 닫아 재시도 폭주를 막는다.
      if (source.readyState === EventSource.CLOSED) source.close()
    }

    return () => source.close()
  }, [enabled, queryClient])
}

export { useAppSse }
