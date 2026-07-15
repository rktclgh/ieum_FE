"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"

import {
  activateAdminUser,
  createAdminUserSanction,
  getAdminUser,
  getAdminUsers,
} from "@/features/admin/users/api/admin-users-api"
import type {
  AdminUsersParams,
  CreateSanctionRequest,
} from "@/features/admin/users/api/admin-users-api"

const adminUserKeys = {
  all: ["admin", "users"] as const,
  lists: () => [...adminUserKeys.all, "list"] as const,
  list: ({ status, q, size }: Omit<AdminUsersParams, "cursor">) =>
    [...adminUserKeys.lists(), { status, q, size }] as const,
  detail: (userId: number) => [...adminUserKeys.all, "detail", userId] as const,
}

function invalidateAdminUserQueries(queryClient: QueryClient, userId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() }),
    queryClient.invalidateQueries({
      queryKey: adminUserKeys.detail(userId),
      exact: true,
    }),
  ])
}

function useAdminUsers({
  status,
  q,
  size,
}: Omit<AdminUsersParams, "cursor">) {
  return useInfiniteQuery({
    queryKey: adminUserKeys.list({ status, q, size }),
    queryFn: ({ pageParam }) =>
      getAdminUsers({ status, q, cursor: pageParam, size }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

function useAdminUserDetail(userId: number) {
  return useQuery({
    queryKey: adminUserKeys.detail(userId),
    queryFn: () => getAdminUser(userId),
  })
}

function useCreateAdminUserSanction(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateSanctionRequest) => createAdminUserSanction(userId, body),
    onSuccess: () => invalidateAdminUserQueries(queryClient, userId),
  })
}

function useActivateAdminUser(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => activateAdminUser(userId),
    onSuccess: () => invalidateAdminUserQueries(queryClient, userId),
  })
}

export {
  adminUserKeys,
  useActivateAdminUser,
  useAdminUserDetail,
  useAdminUsers,
  useCreateAdminUserSanction,
}
