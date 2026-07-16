"use client"

import * as React from "react"
import { Client, type IMessage } from "@stomp/stompjs"

import type {
  ChatWebSocketErrorResponse,
  SendChatMessageRequest,
  WsMessageEvent,
  WsRoomEvent,
} from "@/features/chat/api/chat-types"
import {
  acceptsRoomMessageForChannel,
  roomMessageDestination,
  type RoomMessageChannel,
} from "@/features/chat/lib/chat-room-message-subscription"
import { DEV_BACKEND_ORIGIN, toWebSocketUrl } from "@/lib/runtime/dev-backend-origin"

// 운영은 정적 앱과 같은 브라우저 origin, 로컬 next dev만 명시한 백엔드 origin을 사용한다.
function resolveBrokerUrl() {
  const origin = DEV_BACKEND_ORIGIN ?? window.location.origin
  return toWebSocketUrl(origin)
}

interface ChatSocketHandlers {
  onMessage?: (event: WsMessageEvent) => void
  onRoomEvent?: (event: WsRoomEvent) => void
  onError?: (error: ChatWebSocketErrorResponse) => void
  onConnectedChange?: (connected: boolean) => void
}

// 방 하나에 대한 STOMP 연결을 관리하는 훅.
// - /user/queue/rooms/{roomId} 구독 → 일반 user message 수신 (개인 queue)
// - /topic/rooms/{roomId} 구독 → system message 수신
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

        const subscribeRoomMessages = (channel: RoomMessageChannel) => {
          client.subscribe(roomMessageDestination(activeRoomId, channel), (message: IMessage) => {
            try {
              const event = JSON.parse(message.body) as WsMessageEvent
              if (acceptsRoomMessageForChannel(event, channel)) {
                handlersRef.current.onMessage?.(event)
              }
            } catch {
              // malformed payload는 무시한다.
            }
          })
        }
        // 재연결 때마다 onConnect가 두 subscription을 모두 다시 등록한다.
        subscribeRoomMessages("user")
        subscribeRoomMessages("system")

        // 열린 방에서도 사용자 단위 remove 이벤트를 받아야 강퇴 대상이 즉시 접근을 종료할 수 있다.
        client.subscribe("/user/queue/rooms", (message: IMessage) => {
          try {
            const event = JSON.parse(message.body) as WsRoomEvent
            handlersRef.current.onRoomEvent?.(event)
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

interface ChatRoomsSocketHandlers {
  onRoomEvent?: (event: WsRoomEvent) => void
  onError?: (error: ChatWebSocketErrorResponse) => void
  onConnectedChange?: (connected: boolean) => void
}

// 채팅 목록 화면용 STOMP 연결. 사용자 단위 토픽 하나로 내가 속한 모든 방의 요약 변경을 받는다.
// - /user/queue/rooms 구독 → 방 요약 upsert/remove 이벤트 수신 (BE 이슈 #103)
// - /user/queue/errors 구독 → 세션/검증 에러 수신
// 방 개수와 무관하게 구독 1개로 실시간 목록을 구현한다(방별 /topic/rooms 팬아웃·폴링 불필요).
function useChatRoomsSocket(enabled: boolean, handlers: ChatRoomsSocketHandlers) {
  const [connected, setConnected] = React.useState(false)

  const handlersRef = React.useRef(handlers)
  React.useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  React.useEffect(() => {
    if (!enabled) return

    const client = new Client({
      brokerURL: resolveBrokerUrl(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true)
        handlersRef.current.onConnectedChange?.(true)

        client.subscribe("/user/queue/rooms", (message: IMessage) => {
          try {
            const event = JSON.parse(message.body) as WsRoomEvent
            handlersRef.current.onRoomEvent?.(event)
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

    return () => {
      void client.deactivate()
    }
  }, [enabled])

  return { connected }
}

export { useChatRoomSocket, useChatRoomsSocket }
export type { ChatSocketHandlers, ChatRoomsSocketHandlers }
