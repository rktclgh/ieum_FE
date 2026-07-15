import { uploadImage } from "@/lib/files/upload-image"

// 채팅 첨부 이미지 업로드 → imageFileId(UUID 문자열) 반환. 공용 코어에 위임한다(#123).
async function uploadChatImage(file: File): Promise<string> {
  return uploadImage(file, "chat")
}

export { uploadChatImage }
