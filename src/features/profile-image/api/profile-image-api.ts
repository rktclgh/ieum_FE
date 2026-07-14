import { apiClient } from "@/lib/api/client"

interface ProfileImageResponse {
  profileImageUrl: string
}

// 업로드 완료된 fileId를 내 프로필 사진으로 연결한다. 계약: api-endpoints.md §2 (/users/me/profile-image).
async function updateProfileImage(fileId: string): Promise<ProfileImageResponse> {
  const { data } = await apiClient.put<ProfileImageResponse>(
    "/api/v1/users/me/profile-image",
    { fileId }
  )
  return data
}

// 내 프로필 사진 제거(204).
async function deleteProfileImage(): Promise<void> {
  await apiClient.delete("/api/v1/users/me/profile-image")
}

export { updateProfileImage, deleteProfileImage }
export type { ProfileImageResponse }
