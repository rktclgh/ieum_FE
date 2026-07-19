"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  ChatContextMenu,
  type ChatContextMenuItem,
} from "@/features/chat/components/chat-context-menu"
import { NotificationItem } from "@/features/notification/components/notification-item"
import { NotificationListAppBar } from "@/features/notification/components/notification-list-app-bar"
import { useNotifications } from "@/features/notification/hooks/use-notification-queries"
import {
  useDeleteNotification,
  useReadAllNotifications,
  useReadNotification,
} from "@/features/notification/hooks/use-notification-mutations"
import { useNotificationSse } from "@/features/notification/hooks/use-notification-sse"
import {
  adaptNotification,
  type NotificationEntry,
} from "@/features/notification/lib/notification-adapter"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"

// 컨텍스트 메뉴 대략 높이 + 하단 여유. 아래 공간이 부족하면 메뉴를 행 위로 띄운다.
const CONTEXT_MENU_HEIGHT_ESTIMATE = 100
const BOTTOM_SAFE_AREA = 96

interface NotificationRowProps {
  entry: NotificationEntry
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
  onNavigate: () => void
}

/** 채팅 목록(ChatRow)과 동일한 롱프레스 동작 — 행을 부상시키고 아래에 컨텍스트 메뉴를 앵커한다. */
function NotificationRow({
  entry,
  menuOpen,
  menuItems,
  onOpenMenu,
  onCloseMenu,
  onNavigate,
}: NotificationRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")

  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < CONTEXT_MENU_HEIGHT_ESTIMATE + BOTTOM_SAFE_AREA ? "top" : "bottom")
    }
    onOpenMenu()
  }

  return (
    <div ref={rowRef} className="relative">
      <NotificationItem
        entry={entry}
        active={menuOpen}
        onOpen={onNavigate}
        onLongPress={handleOpenMenu}
      />
      {menuOpen && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={placement === "top" ? "bottom-full left-0 mb-3" : "top-full left-0 mt-2"}
        />
      )}
    </div>
  )
}

// 알림센터 — 목록 + 무한스크롤 + 롱프레스 삭제 + 전체읽음 + SSE 실시간 수신.
// 항목 탭: 읽음 처리 후 refId/type 딥링크로 이동(대상이 없으면 읽음만).
function NotificationsPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const { data: me } = useMe()

  const query = useNotifications()
  const readNotification = useReadNotification()
  const readAll = useReadAllNotifications()
  const deleteNotification = useDeleteNotification()

  // 이 화면에 있는 동안 실시간으로 새 알림을 받아 목록/미읽음을 최신화한다.
  useNotificationSse(Boolean(me))

  const [openMenuId, setOpenMenuId] = React.useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null)

  const entries = React.useMemo(
    () => (query.data?.pages.flatMap((page) => page.items) ?? []).map(adaptNotification),
    [query.data]
  )
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0

  // 무한스크롤 센티널 — 화면 하단에 노출되면 다음 페이지를 가져온다.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return

    const observer = new IntersectionObserver((observed) => {
      if (observed[0].isIntersecting && !isFetchingNextPage) fetchNextPage()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleOpen = (entry: NotificationEntry) => {
    if (!entry.isRead) readNotification.mutate(entry.notificationId)
    if (entry.href) router.push(entry.href)
  }

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col bg-gray-50">
        <NotificationListAppBar
          onBack={() => router.back()}
          onReadAll={() => readAll.mutate()}
          readAllDisabled={unreadCount === 0 || readAll.isPending}
        />

        <div className="flex flex-1 flex-col gap-2 px-4 pt-2 pb-16">
          {query.isError ? (
            <p className="w-full pt-16 text-center text-body-regular-14 text-gray-400">
              {messages.notification.loadError}
            </p>
          ) : entries.length === 0 && !query.isLoading ? (
            <p className="w-full pt-16 text-center text-body-regular-14 text-gray-400">
              {messages.notification.empty}
            </p>
          ) : (
            entries.map((entry) => (
              <NotificationRow
                key={entry.notificationId}
                entry={entry}
                menuOpen={openMenuId === entry.notificationId}
                menuItems={[
                  {
                    icon: <Trash2 className="size-6 text-red" />,
                    label: messages.notification.deleteAction,
                    tone: "destructive" as const,
                    onClick: () => {
                      setOpenMenuId(null)
                      setPendingDeleteId(entry.notificationId)
                    },
                  },
                ]}
                onOpenMenu={() => setOpenMenuId(entry.notificationId)}
                onCloseMenu={() => setOpenMenuId(null)}
                onNavigate={() => handleOpen(entry)}
              />
            ))
          )}
          <div ref={sentinelRef} className="h-4" />
        </div>
      </main>

      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title={messages.notification.deleteConfirmTitle}
        description={messages.notification.deleteConfirmDescription}
        cancelLabel={messages.notification.deleteConfirmCancel}
        confirmLabel={messages.notification.deleteConfirmConfirm}
        onConfirm={() => {
          if (pendingDeleteId != null) deleteNotification.mutate(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </>
  )
}

export { NotificationsPageContent }
