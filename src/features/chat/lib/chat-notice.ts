interface ChatNoticeSortShape {
  noticeId: number
  pinned: boolean
  createdAt: string
}

interface ChatNoticePinRequest {
  roomId: number
  noticeId: number
  pinned: boolean
}

interface ChatNoticePinTransport {
  pinNotice: (roomId: number, noticeId: number) => Promise<unknown>
  unpinNotice: (roomId: number, noticeId: number) => Promise<unknown>
}

interface ChatNoticeRegistrationRequest {
  roomId: number
  messageId: number
}

interface ChatNoticeRegistrationTransport {
  registerNotice: (roomId: number, messageId: number) => Promise<{ noticeId: number; pinned: boolean }>
  pinNotice: (roomId: number, noticeId: number) => Promise<unknown>
}

interface ChatNoticePageShape<T> {
  items: T[]
}

function flattenChatNoticePages<T>(pages: readonly ChatNoticePageShape<T>[]): T[] {
  return pages.flatMap((page) => page.items)
}

function sortChatNoticesForDisplay<T extends ChatNoticeSortShape>(notices: readonly T[]): T[] {
  return [...notices].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
    return b.noticeId - a.noticeId
  })
}

function mergePinnedNoticeForDisplay<T extends ChatNoticeSortShape>(
  notices: readonly T[],
  pinnedNotice: T | null | undefined
): T[] {
  const merged = pinnedNotice
    ? [pinnedNotice, ...notices.filter((notice) => notice.noticeId !== pinnedNotice.noticeId)]
    : [...notices]
  return sortChatNoticesForDisplay(merged)
}

async function executeSetChatNoticePinned(
  request: ChatNoticePinRequest,
  transport: ChatNoticePinTransport
): Promise<void> {
  if (request.pinned) {
    await transport.pinNotice(request.roomId, request.noticeId)
    return
  }
  await transport.unpinNotice(request.roomId, request.noticeId)
}

// 채팅방에서의 "공지로 등록"은 기존 UI처럼 곧바로 상단 공지로 노출한다.
// 등록 API는 중복 시에도 정본 공지를 반환하므로, 이미 등록된 메시지도 같은 흐름으로 고정할 수 있다.
async function executeRegisterChatNotice(
  request: ChatNoticeRegistrationRequest,
  transport: ChatNoticeRegistrationTransport
): Promise<void> {
  const notice = await transport.registerNotice(request.roomId, request.messageId)
  if (notice.pinned) return
  await transport.pinNotice(request.roomId, notice.noticeId)
}

export {
  executeRegisterChatNotice,
  executeSetChatNoticePinned,
  flattenChatNoticePages,
  mergePinnedNoticeForDisplay,
  sortChatNoticesForDisplay,
}
export type {
  ChatNoticePinRequest,
  ChatNoticePinTransport,
  ChatNoticeRegistrationRequest,
  ChatNoticeRegistrationTransport,
  ChatNoticeSortShape,
}
