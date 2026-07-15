"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { getNotifications } from "@/features/notification/api/notification-api"

const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
}

// 알림 목록 무한스크롤(커서 기반). nextCursor 가 null 이면 마지막 페이지.
function useNotifications(size = 20) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam }) => getNotifications({ cursor: pageParam, size }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

// 종 배지용 미읽음 수. 목록 첫 페이지의 unreadCount 만 필요하므로 size=1 로 가볍게 조회한다.
// 로그아웃 상태에선 401 이 나므로 enabled 로 막는다. SSE/뮤테이션이 이 키를 무효화해 최신화.
function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => getNotifications({ size: 1 }),
    enabled,
    select: (data) => data.unreadCount,
    refetchOnWindowFocus: true,
  })
}

export { notificationKeys, useNotifications, useUnreadCount }
