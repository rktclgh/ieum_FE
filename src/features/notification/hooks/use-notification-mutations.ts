"use client"

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"

import {
  deleteNotification,
  readNotification,
} from "@/features/notification/api/notification-api"
import type { NotificationsPage } from "@/features/notification/api/notification-types"
import { notificationKeys } from "@/features/notification/hooks/use-notification-queries"

type ListData = InfiniteData<NotificationsPage, string | null>

// 미읽음 수는 목록 각 페이지의 unreadCount(집계값)와 별도 배지 쿼리 양쪽에 담긴다.
// 낙관적 업데이트가 "새로고침해야 반영"되는 문제(이슈 #125)를 막도록 둘 다 즉시 갱신한다.
function setUnreadCount(qc: QueryClient, updater: (count: number) => number) {
  qc.setQueryData<ListData>(notificationKeys.list(), (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            unreadCount: Math.max(0, updater(page.unreadCount)),
          })),
        }
      : old
  )
  qc.setQueryData<NotificationsPage>(notificationKeys.unreadCount(), (old) =>
    old ? { ...old, unreadCount: Math.max(0, updater(old.unreadCount)) } : old
  )
}

function snapshot(qc: QueryClient) {
  return {
    list: qc.getQueryData<ListData>(notificationKeys.list()),
    count: qc.getQueryData<NotificationsPage>(notificationKeys.unreadCount()),
  }
}

function restore(qc: QueryClient, ctx?: ReturnType<typeof snapshot>) {
  if (!ctx) return
  qc.setQueryData(notificationKeys.list(), ctx.list)
  qc.setQueryData(notificationKeys.unreadCount(), ctx.count)
}

// 단건 읽음 — 목록에서 해당 알림을 읽음으로 표시하고, 원래 미읽음이었다면 배지를 1 감소.
function useReadNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: readNotification,
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all })
      const ctx = snapshot(qc)

      const wasUnread = ctx.list?.pages.some((page) =>
        page.items.some((item) => item.notificationId === id && !item.isRead)
      )

      qc.setQueryData<ListData>(notificationKeys.list(), (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.notificationId === id ? { ...item, isRead: true } : item
                ),
              })),
            }
          : old
      )
      if (wasUnread) setUnreadCount(qc, (count) => count - 1)

      return ctx
    },
    onError: (_error, _id, ctx) => restore(qc, ctx),
    // 낙관적 업데이트가 목록을 결정적으로 갱신하므로 목록 전체(모든 페이지) 재조회는
    // 불필요. 서버 권위값인 미읽음 배지만 무효화한다.
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
  })
}

// 단건 삭제 — 목록에서 제거하고, 읽지 않은 알림이었다면 배지를 1 감소.
function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteNotification,
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all })
      const ctx = snapshot(qc)

      const wasUnread = ctx.list?.pages.some((page) =>
        page.items.some((item) => item.notificationId === id && !item.isRead)
      )

      qc.setQueryData<ListData>(notificationKeys.list(), (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => item.notificationId !== id),
              })),
            }
          : old
      )
      if (wasUnread) setUnreadCount(qc, (count) => count - 1)

      return ctx
    },
    onError: (_error, _id, ctx) => restore(qc, ctx),
    // 낙관적 업데이트가 목록에서 항목을 이미 제거했으므로, 서버 권위값인 배지만 무효화한다.
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
  })
}

// 전체 삭제 — BE 에 벌크 삭제 엔드포인트가 없어(단건 DELETE 만 존재) 단건 삭제를 팬아웃한다.
// 그래서 "전체"의 범위는 지금까지 로드된 페이지의 항목들이다. BE 벌크 API 가 생기면 교체할 것.
// 일부만 실패해도 목록은 서버 기준으로 다시 맞춰야 하므로 onSettled 에서 전체를 무효화한다.
function useDeleteAllNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => deleteNotification(id)))
      const failed = results.filter((result) => result.status === "rejected").length
      if (failed > 0 && failed === ids.length) throw new Error("failed to delete notifications")
      return { deleted: ids.length - failed, failed }
    },
    onMutate: async (ids: number[]) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all })
      const ctx = snapshot(qc)
      const targets = new Set(ids)

      const removedUnread =
        ctx.list?.pages.reduce(
          (total, page) =>
            total +
            page.items.filter((item) => targets.has(item.notificationId) && !item.isRead).length,
          0
        ) ?? 0

      qc.setQueryData<ListData>(notificationKeys.list(), (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => !targets.has(item.notificationId)),
              })),
            }
          : old
      )
      if (removedUnread > 0) setUnreadCount(qc, (count) => count - removedUnread)

      return ctx
    },
    onError: (_error, _ids, ctx) => restore(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export { useReadNotification, useDeleteNotification, useDeleteAllNotifications }
