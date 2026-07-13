import axios from "axios"

import { apiClient } from "@/lib/api/client"

// 이미지 첨부: presign → S3 직접 PUT → complete 3단계(#30 파일 레이어 참고).
// 공유 헬퍼가 아직 없어 질문/답변 첨부용으로 최소 구현을 features/question/api에 둔다.

interface PresignResponse {
  fileId: number
  uploadUrl: string
}

// S3 presigned PUT은 same-origin이 아니므로 쿠키/CSRF를 실으면 안 된다.
// apiClient(withCredentials + X-CSRF-Token)가 아닌 순수 axios로 업로드한다.
const s3Client = axios.create({ withCredentials: false })

async function presignFile(file: File) {
  const { data } = await apiClient.post<PresignResponse>("/api/v1/files/presign", {
    purpose: "question",
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  })
  return data
}

async function putToS3(uploadUrl: string, file: File) {
  await s3Client.put(uploadUrl, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
  })
}

async function completeFile(fileId: number) {
  await apiClient.post(`/api/v1/files/${fileId}/complete`)
}

// 파일 1건을 업로드하고 완료 처리된 fileId를 돌려준다.
async function uploadImage(file: File): Promise<number> {
  const { fileId, uploadUrl } = await presignFile(file)
  await putToS3(uploadUrl, file)
  await completeFile(fileId)
  return fileId
}

// 여러 파일을 병렬 업로드하고 입력 순서대로 fileId 배열을 돌려준다(질문/답변 imageFileIds용).
async function uploadImages(files: File[]): Promise<number[]> {
  return Promise.all(files.map((file) => uploadImage(file)))
}

export { uploadImage, uploadImages }
