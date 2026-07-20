// 서버가 SSE 로 내려주는 친구 접속 상태 이벤트(BE #208).
//   event: presence
//   data: { "userId": 123, "online": true }
interface FriendPresence {
  userId: number
  online: boolean
}

// 서버가 아직 presence 를 보내지 않거나 형태가 다르면 null 을 반환해 무시한다.
// 스트림 하나로 여러 도메인 이벤트가 흐르므로, 모르는 payload 에 깨지지 않는 편이 안전하다.
function parseFriendPresenceEvent(data: string): FriendPresence | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (typeof parsed !== "object" || parsed === null) return null
    const { userId, online } = parsed as Record<string, unknown>
    if (typeof userId !== "number" || typeof online !== "boolean") return null
    return { userId, online }
  } catch {
    return null
  }
}

export { parseFriendPresenceEvent }
export type { FriendPresence }
