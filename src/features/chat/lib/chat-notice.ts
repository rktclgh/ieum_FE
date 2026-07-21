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

export {
  executeSetChatNoticePinned,
  flattenChatNoticePages,
  mergePinnedNoticeForDisplay,
  sortChatNoticesForDisplay,
}
export type { ChatNoticePinRequest, ChatNoticePinTransport, ChatNoticeSortShape }
