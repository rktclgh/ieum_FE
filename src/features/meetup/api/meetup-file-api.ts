import { uploadImage } from "@/lib/files/upload-image"

// 모임 대표 이미지 업로드 → imageFileId(number) 반환. 공용 코어에 위임한다(#30).
async function uploadMeetingImage(file: File): Promise<number> {
  return uploadImage(file, "meeting")
}

export { uploadMeetingImage }
