import axios from "axios"

import { apiClient } from "@/lib/api/client"

// 이미지 업로드 3단계(presign → S3 직접 PUT → complete). 계약: ieum_BE/docs/api-endpoints.md §10.
export type UploadPurpose = "profile" | "meeting" | "question"

interface PresignResponse {
  fileId: number
  uploadUrl: string
}

// S3 presigned PUT은 same-origin이 아니므로 쿠키/CSRF를 실으면 안 된다.
// apiClient(withCredentials + X-CSRF-Token) 대신 순수 axios로 업로드한다.
const s3Client = axios.create({ withCredentials: false })

// blob.type이 빈 문자열이면 presign 서명과 Content-Type이 불일치(SignatureDoesNotMatch)할 수 있어 폴백을 둔다.
function resolveContentType(blob: Blob): string {
  return blob.type || "image/jpeg"
}

async function presign(blob: Blob, purpose: UploadPurpose): Promise<PresignResponse> {
  const { data } = await apiClient.post<PresignResponse>("/api/v1/files/presign", {
    purpose,
    contentType: resolveContentType(blob),
    sizeBytes: blob.size,
  })
  return data
}

async function putToS3(uploadUrl: string, blob: Blob): Promise<void> {
  await s3Client.put(uploadUrl, blob, {
    headers: { "Content-Type": resolveContentType(blob) },
  })
}

async function completeFile(fileId: number): Promise<void> {
  await apiClient.post(`/api/v1/files/${fileId}/complete`)
}

// 이미지 1건을 업로드하고 완료 처리된 fileId를 반환한다.
export async function uploadImage(blob: Blob, purpose: UploadPurpose): Promise<number> {
  const { fileId, uploadUrl } = await presign(blob, purpose)
  await putToS3(uploadUrl, blob)
  await completeFile(fileId)
  return fileId
}
