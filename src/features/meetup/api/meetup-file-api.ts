import { uploadImage } from "@/lib/files/upload-image"

// 모임 대표 이미지 업로드 → imageFileId(UUID 문자열) 반환. 공용 코어에 위임한다(#30).
async function uploadMeetingImage(file: File): Promise<string> {
  return uploadImage(file, "meeting")
}

export { uploadMeetingImage }
