"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteProfileImage, updateProfileImage } from "@/features/profile-image/api/profile-image-api"
import type { UserMeResponse } from "@/features/session/api/session-api"
import { uploadImage } from "@/lib/files/upload-image"

// 크롭 blob → presign/S3/complete → 프로필 연결. 성공 시 ["me"] 의 profileImageUrl 만 갱신한다.
function useProfileImageUpload() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const fileId = await uploadImage(blob, "profile")
      return updateProfileImage(fileId)
    },
    onSuccess: ({ profileImageUrl }) => {
      queryClient.setQueryData<UserMeResponse>(["me"], (previous) =>
        previous ? { ...previous, profileImageUrl } : previous
      )
    },
  })
  return {
    upload: (blob: Blob) => mutation.mutateAsync(blob),
    isUploading: mutation.isPending,
    isError: mutation.isError,
  }
}

function useDeleteProfileImage() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: deleteProfileImage,
    onSuccess: () => {
      queryClient.setQueryData<UserMeResponse>(["me"], (previous) =>
        previous ? { ...previous, profileImageUrl: null } : previous
      )
    },
  })
  return {
    remove: () => mutation.mutateAsync(),
    isDeleting: mutation.isPending,
  }
}

export { useProfileImageUpload, useDeleteProfileImage }
