"use client"

import * as React from "react"
import { Client, type IMessage } from "@stomp/stompjs"

import type {
  ChatWebSocketErrorResponse,
  SendChatMessageRequest,
  WsMessageEvent,
} from "@/features/chat/api/chat-types"
import { DEV_BACKEND_ORIGIN, toWebSocketUrl } from "@/lib/runtime/dev-backend-origin"

// 운영은 정적 앱과 같은 브라우저 origin, 로컬 next dev만 명시한 백엔드 origin을 사용한다.
function resolveBrokerUrl() {
  const origin = DEV_BACKEND_ORIGIN ?? window.location.origin
  return toWebSocketUrl(origin)
}

interface ChatSocketHandlers {
  onMessage?: (event: WsMessageEvent) => void
  onError?: (error: ChatWebSocketErrorResponse) => void
  onConnectedChange?: (connected: boolean) => void
}

// 방 하나에 대한 STOMP 연결을 관리하는 훅.
// - /topic/rooms/{roomId} 구독 → 메시지 수신
// - /user/queue/errors 구독 → 검증/세션 에러 수신
// - send()로 /app/rooms/{roomId}/send 발행
function useChatRoomSocket(activeRoomId: number | null, handlers: ChatSocketHandlers) {
  const clientRef = React.useRef<Client | null>(null)
  const [connected, setConnected] = React.useState(false)

  // 핸들러는 매 렌더 새로 생성될 수 있어 ref에 담아 최신값을 구독 콜백이 참조하게 한다.
  // 렌더 중 ref 쓰기(react-hooks/refs 위반)를 피하려 커밋 이후 effect에서 갱신한다.
  const handlersRef = React.useRef(handlers)
  React.useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  React.useEffect(() => {
    if (activeRoomId == null) return

    const client = new Client({
      brokerURL: resolveBrokerUrl(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true)
        handlersRef.current.onConnectedChange?.(true)

        client.subscribe(`/topic/rooms/${activeRoomId}`, (message: IMessage) => {
          try {
            const event = JSON.parse(message.body) as WsMessageEvent
            handlersRef.current.onMessage?.(event)
          } catch {
            // malformed payload는 무시한다.
          }
        })

        client.subscribe("/user/queue/errors", (message: IMessage) => {
          try {
            const error = JSON.parse(message.body) as ChatWebSocketErrorResponse
            handlersRef.current.onError?.(error)
          } catch {
            // ignore
          }
        })
      },
      onDisconnect: () => {
        setConnected(false)
        handlersRef.current.onConnectedChange?.(false)
      },
      onWebSocketClose: () => {
        setConnected(false)
        handlersRef.current.onConnectedChange?.(false)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      clientRef.current = null
      void client.deactivate()
    }
  }, [activeRoomId])

  const send = React.useCallback(
    (payload: SendChatMessageRequest) => {
      const client = clientRef.current
      if (!client || !client.connected || activeRoomId == null) return false
      client.publish({
        destination: `/app/rooms/${activeRoomId}/send`,
        body: JSON.stringify(payload),
      })
      return true
    },
    [activeRoomId]
  )

  return { connected, send }
}

export { useChatRoomSocket }
export type { ChatSocketHandlers }
