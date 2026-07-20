"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { NotificationDeleteBar } from "@/features/notification/components/notification-delete-bar"
import { NotificationItem } from "@/features/notification/components/notification-item"
import { NotificationListAppBar } from "@/features/notification/components/notification-list-app-bar"
import { useNotifications } from "@/features/notification/hooks/use-notification-queries"
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useReadNotification,
} from "@/features/notification/hooks/use-notification-mutations"
import { useAppSse } from "@/features/session/hooks/use-app-sse"
import {
  adaptNotification,
  type NotificationEntry,
} from "@/features/notification/lib/notification-adapter"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"

// 알림센터 — 목록 + 무한스크롤 + 삭제 모드 + SSE 실시간 수신.
// 항목 탭: 읽음 처리 후 refId/type 딥링크로 이동(대상이 없으면 읽음만).
// 상단 쓰레기통은 삭제 모드를, 톱니는 마이페이지 알림 설정을 연다.
function NotificationsPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const { data: me } = useMe()

  const query = useNotifications()
  const readNotification = useReadNotification()
  const deleteNotification = useDeleteNotification()
  const deleteAll = useDeleteAllNotifications()

  // 이 화면에 있는 동안 실시간으로 새 알림을 받아 목록/미읽음을 최신화한다.
  useAppSse(Boolean(me))

  const [deleteMode, setDeleteMode] = React.useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = React.useState(false)

  const entries = React.useMemo(
    () => (query.data?.pages.flatMap((page) => page.items) ?? []).map(adaptNotification),
    [query.data]
  )

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

  // 마지막 한 건까지 지우고 나면 삭제 모드를 보여줄 이유가 없다(지울 대상이 없음).
  const showDeleteMode = deleteMode && entries.length > 0

  const handleOpen = (entry: NotificationEntry) => {
    if (!entry.isRead) readNotification.mutate(entry.notificationId)
    if (entry.href) router.push(entry.href)
  }

  // 목록을 비우는 삭제는 삭제 모드 상태 자체를 내린다. 파생값(showDeleteMode)만으로 숨기면
  // 이후 SSE 로 새 알림이 들어왔을 때 사용자가 켠 적 없는 삭제 모드가 되살아난다.
  const handleDelete = (notificationId: number) => {
    deleteNotification.mutate(notificationId)
    if (entries.length <= 1) setDeleteMode(false)
  }

  const handleDeleteAll = () => {
    deleteAll.mutate(entries.map((entry) => entry.notificationId))
    setDeleteMode(false)
    setConfirmDeleteAll(false)
  }

  return (
    <>
      <main className="app-column flex min-h-dvh flex-col bg-white">
        <NotificationListAppBar
          deleteMode={showDeleteMode}
          onBack={() => (showDeleteMode ? setDeleteMode(false) : router.back())}
          onEnterDeleteMode={() => setDeleteMode(true)}
          onOpenSettings={() => router.push("/my/notifications")}
        />

        {showDeleteMode && (
          <NotificationDeleteBar
            deleteAllDisabled={entries.length === 0 || deleteAll.isPending}
            onDeleteAll={() => setConfirmDeleteAll(true)}
            onClose={() => setDeleteMode(false)}
          />
        )}

        <div className="flex flex-1 flex-col pb-[calc(4rem+var(--safe-area-bottom))]">
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
                deleteMode={showDeleteMode}
                onOpen={() => handleOpen(entry)}
                onDelete={() => handleDelete(entry.notificationId)}
              />
            ))
          )}
          <div ref={sentinelRef} className="h-4" />
        </div>
      </main>

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title={messages.notification.deleteAllConfirmTitle}
        description={messages.notification.deleteAllConfirmDescription}
        cancelLabel={messages.notification.deleteConfirmCancel}
        confirmLabel={messages.notification.deleteConfirmConfirm}
        onConfirm={handleDeleteAll}
      />
    </>
  )
}

export { NotificationsPageContent }
