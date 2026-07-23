"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  deleteAdminContent,
  getAdminContentPreview,
} from "@/features/admin/content/api/admin-content-api"
import type { AdminContentType } from "@/features/admin/content/api/admin-content-api"

const adminContentKeys = {
  all: ["admin", "content"] as const,
  preview: (type: AdminContentType, id: number) => [
    ...adminContentKeys.all,
    "preview",
    type,
    id,
  ] as const,
}

interface DeleteAdminContentInput {
  type: AdminContentType
  id: number
  confirmationToken: string
}

function useAdminContentPreview(
  type: AdminContentType | null,
  id: number | null,
) {
  return useQuery({
    queryKey:
      type !== null && id !== null
        ? adminContentKeys.preview(type, id)
        : [...adminContentKeys.all, "preview", "idle"] as const,
    queryFn: () => getAdminContentPreview(type as AdminContentType, id as number),
    enabled: type !== null && id !== null,
  })
}

function useDeleteAdminContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, id, confirmationToken }: DeleteAdminContentInput) =>
      deleteAdminContent(type, id, confirmationToken),
    onSuccess: (_data, { type, id }) => {
      queryClient.removeQueries({
        queryKey: adminContentKeys.preview(type, id),
        exact: true,
      })
    },
  })
}

export { adminContentKeys, useAdminContentPreview, useDeleteAdminContent }
export type { DeleteAdminContentInput }
