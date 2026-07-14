import { uploadImage as uploadImageCore } from "@/lib/files/upload-image"

// 질문/답변 첨부 이미지 업로드 → fileId(number) 반환. 공용 코어에 위임한다(#30).
async function uploadImage(file: File): Promise<number> {
  return uploadImageCore(file, "question")
}

export { uploadImage }
