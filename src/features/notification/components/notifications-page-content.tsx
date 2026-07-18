"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  LongPressActionOverlay,
  type LongPressAction,
} from "@/features/question/components/long-press-action-overlay"
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

  const [active, setActive] = React.useState<{
    id: number
    rect: DOMRect
    entry: NotificationEntry
  } | null>(null)
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
      <main className="app-column flex min-h-dvh flex-col bg-gray-50">
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
              <NotificationItem
                key={entry.notificationId}
                entry={entry}
                onOpen={() => handleOpen(entry)}
                onLongPress={(rect) =>
                  setActive({ id: entry.notificationId, rect, entry })
                }
              />
            ))
          )}
          <div ref={sentinelRef} className="h-4" />
        </div>
      </main>

      {active && (
        <LongPressActionOverlay
          anchorRect={active.rect}
          onDismiss={() => setActive(null)}
          actions={
            [
              {
                icon: <Trash2 className="size-5 text-red" />,
                label: messages.notification.deleteAction,
                tone: "destructive",
                onClick: () => setPendingDeleteId(active.id),
              },
            ] satisfies LongPressAction[]
          }
        >
          <NotificationItem entry={active.entry} onOpen={() => {}} onLongPress={() => {}} />
        </LongPressActionOverlay>
      )}

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
