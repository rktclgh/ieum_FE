"use client"

import * as React from "react"

// 회원가입류 플로우(가입/소셜가입) 공용 아바타 크롭 상태: 선택 → 에디터 오픈 → 크롭 결과 보관.
// 실제 업로드는 각 플로우의 제출 시점에 croppedBlob 을 사용해 처리한다.
function useAvatarCropState() {
  const [croppedBlob, setCroppedBlob] = React.useState<Blob | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
  const [editorSrc, setEditorSrc] = React.useState<string | null>(null)

  const onAvatarFileSelected = (file: File) => {
    setEditorSrc(URL.createObjectURL(file))
  }

  const onCropped = (blob: Blob) => {
    setCroppedBlob(blob)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(blob))
  }

  const onEditorClose = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc)
    setEditorSrc(null)
  }

  return {
    croppedBlob,
    avatarPreview,
    editorSrc,
    onAvatarFileSelected,
    onEditorClose,
    onCropped,
  }
}

export { useAvatarCropState }
