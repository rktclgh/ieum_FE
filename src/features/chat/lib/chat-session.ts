interface ChatSessionUser {
  userId: number
}

interface ChatSessionAccess {
  authenticated: boolean
  userId: number | null
  activeRoomId: number | null
  scopeKey: string
}

function isPositiveSafeInteger(value: number | undefined): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value > 0
}

function resolveChatSessionAccess(
  me: ChatSessionUser | null | undefined,
  requestedRoomId?: number,
): ChatSessionAccess {
  const userId = isPositiveSafeInteger(me?.userId) ? me.userId : null
  const activeRoomId =
    userId !== null && isPositiveSafeInteger(requestedRoomId)
      ? requestedRoomId
      : null
  const scope = requestedRoomId === undefined ? "list" : `room:${requestedRoomId}`

  return {
    authenticated: userId !== null,
    userId,
    activeRoomId,
    scopeKey: userId === null ? `inactive:${scope}` : `user:${userId}:${scope}`,
  }
}

export { resolveChatSessionAccess }
export type { ChatSessionAccess, ChatSessionUser }
