"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  deleteAdminContent,
  getAdminContentDetail,
  getAdminContents,
  updateAdminContent,
} from "@/features/admin/content/api/admin-content-api"
import type {
  AdminContentListParams,
  AdminContentType,
  AdminContentUpdateRequest,
} from "@/features/admin/content/api/admin-content-api"

const adminContentKeys = {
  all: ["admin", "content"] as const,
  lists: () => [...adminContentKeys.all, "list"] as const,
  list: ({ type, size }: Omit<AdminContentListParams, "cursor">) =>
    [...adminContentKeys.lists(), { type, size }] as const,
  detail: (type: AdminContentType, id: number) => [
    ...adminContentKeys.all,
    "detail",
    type,
    id,
  ] as const,
}

interface DeleteAdminContentInput {
  type: AdminContentType
  id: number
  confirmationToken: string
}

interface UpdateAdminContentInput {
  type: AdminContentType
  id: number
  body: AdminContentUpdateRequest
}

function useAdminContents({
  type,
  size,
}: Omit<AdminContentListParams, "cursor">) {
  return useInfiniteQuery({
    queryKey: adminContentKeys.list({ type, size }),
    queryFn: ({ pageParam }) =>
      getAdminContents({ type, cursor: pageParam, size }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

function useAdminContentDetail(type: AdminContentType, id: number) {
  return useQuery({
    queryKey: adminContentKeys.detail(type, id),
    queryFn: () => getAdminContentDetail(type, id),
  })
}

function useUpdateAdminContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, id, body }: UpdateAdminContentInput) =>
      updateAdminContent(type, id, body),
    onSuccess: (_data, { type, id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminContentKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: adminContentKeys.detail(type, id),
          exact: true,
        }),
      ]),
  })
}

function useDeleteAdminContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, id, confirmationToken }: DeleteAdminContentInput) =>
      deleteAdminContent(type, id, confirmationToken),
    onSuccess: (_data, { type, id }) => {
      void queryClient.invalidateQueries({ queryKey: adminContentKeys.lists() })
      queryClient.removeQueries({
        queryKey: adminContentKeys.detail(type, id),
        exact: true,
      })
    },
  })
}

export {
  adminContentKeys,
  useAdminContentDetail,
  useAdminContents,
  useDeleteAdminContent,
  useUpdateAdminContent,
}
export type { DeleteAdminContentInput, UpdateAdminContentInput }
