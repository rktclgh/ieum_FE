import { apiClient } from "@/lib/api/client"

// 이미지 업로드 3단계(presign → S3 직접 PUT → complete). 계약: api-reference.md §8.
// 공유 업로드 헬퍼가 아직 없어 모임 이미지 첨부용으로 최소 구현한다(#30에서 공용화 예정).

interface PresignResponse {
  fileId: number
  uploadUrl: string
}

// 업로드 완료 후 imageFileId 로 쓸 fileId(number)를 반환한다.
async function uploadMeetingImage(file: File): Promise<number> {
  const { data: presigned } = await apiClient.post<PresignResponse>("/api/v1/files/presign", {
    purpose: "meeting",
    contentType: file.type,
    sizeBytes: file.size,
  })

  // S3 presigned URL 직접 PUT — 쿠키/CSRF 불필요하므로 apiClient(withCredentials)가 아니라 raw fetch 사용.
  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  })
  if (!uploadResponse.ok) throw new Error("Failed to upload image to storage")

  await apiClient.post(`/api/v1/files/${presigned.fileId}/complete`)
  return presigned.fileId
}

export { uploadMeetingImage }
