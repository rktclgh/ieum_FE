"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Toast } from "@/components/ui/toast"
import { FullScreenOverlay } from "@/components/ui/full-screen-overlay"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"
import { NoticeListItem } from "@/features/chat/components/notice-list-item"
import type { ChatNoticeResponse } from "@/features/chat/api/chat-types"
import { useChatNotices, useChatSessionAccess } from "@/features/chat/hooks/use-chat-queries"
import { useSetChatNoticePinned } from "@/features/chat/hooks/use-chat-mutations"
import { mergePinnedNoticeForDisplay } from "@/features/chat/lib/chat-notice"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { resolveFileUrl } from "@/lib/api/file-url"
import { formatKstTime } from "@/lib/date/kst"
import { cn } from "@/lib/utils"
import { Globe } from "lucide-react"

const NOTICE_BOTTOM_SAFE_AREA = 96

interface NoticeRowProps {
  notice: ChatNoticeResponse
  isAuthenticated: boolean
  actionPending: boolean
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function NoticeRow({
  notice,
  isAuthenticated,
  actionPending,
  menuOpen,
  menuItems,
  onOpenMenu,
  onCloseMenu,
}: NoticeRowProps) {
  const { messages } = useTranslation()
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const title = notice.message.content?.trim() ?? ""
  const translate = useTranslateToggle({ text: title, isAuthenticated })

  const translateMenuItem: ChatContextMenuItem = {
    icon: <Globe className="size-6 text-gray-900" />,
    label: translate.isLoading
      ? messages.translate.translatingLabel
      : translate.isShowingTranslation
        ? messages.translate.viewOriginalLabel
        : messages.translate.menuLabel,
    onClick: () => {
      translate.toggle()
      onCloseMenu()
    },
  }

  const fullMenuItems = translate.canTranslate ? [translateMenuItem, ...menuItems] : menuItems

  // 목록 하단 행에서 메뉴가 화면 밖으로 잘리지 않도록 여유 공간을 보고 위/아래를 고른다.
  // 번역 항목이 조건부라 높이가 변하므로 실제 항목 수로 계산한다.
  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(
        spaceBelow < contextMenuHeight(fullMenuItems.length) + NOTICE_BOTTOM_SAFE_AREA ? "top" : "bottom"
      )
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative" {...longPress}>
      <NoticeListItem
        title={translate.displayText}
        authorName={notice.message.senderNickname}
        authorAvatarSrc={resolveFileUrl(notice.message.senderProfileImageUrl)}
        time={formatKstTime(notice.createdAt)}
        pinned={notice.pinned}
        active={menuOpen || actionPending}
      />
      {translate.isError ? (
        <p className="ml-[52px] -mt-1 pb-2 text-body-regular-12 text-red">
          {messages.translate.translateFailedLabel}
        </p>
      ) : null}
      {menuOpen && (
        <ChatContextMenu
          items={fullMenuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={cn(
            // Figma 1951:27443 — 제목이 아니라 카드 좌측(컨테이너 px-4 = 16px)에 맞춘다.
            "left-0",
            placement === "top" ? "bottom-full mb-5" : "top-full mt-3"
          )}
        />
      )}
    </div>
  )
}

interface NoticePageContentProps {
  roomId: number
}

function NoticePageContent({ roomId }: NoticePageContentProps) {
  const router = useRouter()
  const { messages } = useTranslation()
  const session = useChatSessionAccess(roomId)
  const noticesQuery = useChatNotices(roomId, session)
  const setNoticePinnedMutation = useSetChatNoticePinned()
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = noticesQuery

  const [activeNoticeId, setActiveNoticeId] = React.useState<number | null>(null)
  const [pinFailed, setPinFailed] = React.useState(false)

  const sortedNotices = React.useMemo(
    () => mergePinnedNoticeForDisplay(noticesQuery.notices, noticesQuery.pinnedNotice),
    [noticesQuery.notices, noticesQuery.pinnedNotice]
  )

  const menuItemsFor = (notice: ChatNoticeResponse): ChatContextMenuItem[] =>
    notice.pinned
      ? [
          {
            icon: <Image src="/icons/chat/pin-off.svg" alt="" width={24} height={24} />,
            label: messages.chat.unsetChatNoticeAction,
            disabled: setNoticePinnedMutation.isPending,
            onClick: () => {
              if (setNoticePinnedMutation.isPending) return
              setPinFailed(false)
              setNoticePinnedMutation.mutate(
                { roomId, noticeId: notice.noticeId, pinned: false },
                {
                  onError: () => setPinFailed(true),
                  onSettled: () => setActiveNoticeId(null),
                }
              )
            },
          },
        ]
      : [
          {
            icon: <Image src="/icons/chat/pin-line.svg" alt="" width={24} height={24} />,
            label: messages.chat.setChatNoticeAction,
            disabled: setNoticePinnedMutation.isPending,
            onClick: () => {
              if (setNoticePinnedMutation.isPending) return
              setPinFailed(false)
              setNoticePinnedMutation.mutate(
                { roomId, noticeId: notice.noticeId, pinned: true },
                {
                  onError: () => setPinFailed(true),
                  onSettled: () => setActiveNoticeId(null),
                }
              )
            },
          },
        ]

  return (
    // 라우트 화면이라 항상 열려 있다 — 마운트 시 아래에서 올라오는 진입 모션만 쓴다.
    <FullScreenOverlay open className="app-column flex flex-col overflow-hidden bg-white">
      <AppBar
        title={messages.chat.noticeLabel}
        trailingVariant="close"
        onLeadingClick={() => router.back()}
        onTrailingClick={() => router.back()}
        className="shrink-0"
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {noticesQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          </div>
        ) : noticesQuery.isError ? (
          <p className="py-16 text-center text-body-regular-14 text-red-500">
            {messages.chat.noticeLoadFailed}
          </p>
        ) : sortedNotices.length === 0 ? (
          <p className="py-16 text-center text-body-regular-14 text-gray-400">{messages.chat.noticeEmptyLabel}</p>
        ) : (
          <>
            {sortedNotices.map((notice) => (
              <NoticeRow
                key={notice.noticeId}
                notice={notice}
                isAuthenticated={session.authenticated}
                actionPending={setNoticePinnedMutation.isPending && activeNoticeId === notice.noticeId}
                menuOpen={activeNoticeId === notice.noticeId}
                menuItems={menuItemsFor(notice)}
                onOpenMenu={() => setActiveNoticeId(notice.noticeId)}
                onCloseMenu={() => setActiveNoticeId(null)}
              />
            ))}
            {hasNextPage ? (
              <button
                type="button"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="mx-auto mt-3 flex min-h-10 items-center justify-center rounded-full px-5 text-body-medium-14 text-gray-700 disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                ) : (
                  messages.chat.noticeLoadMoreLabel
                )}
              </button>
            ) : null}
          </>
        )}
      </div>
      <Toast open={pinFailed} message={messages.chat.noticePinFailed} />
    </FullScreenOverlay>
  )
}

export { NoticePageContent }
