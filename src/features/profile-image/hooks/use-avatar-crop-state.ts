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

  // 언마운트 시 남아있는 objectURL 을 정리(리크 방지).
  // deps 변경마다 revoke 하면 편집기 재오픈/취소 시 현재 미리보기 URL 이 조기 폐기될 수 있어,
  // 최신 값을 ref 에 동기화해 두고 실제 폐기는 언마운트에서 한 번만 한다.
  const latestUrls = React.useRef({ avatarPreview, editorSrc })
  React.useEffect(() => {
    latestUrls.current = { avatarPreview, editorSrc }
  }, [avatarPreview, editorSrc])
  React.useEffect(
    () => () => {
      if (latestUrls.current.avatarPreview) URL.revokeObjectURL(latestUrls.current.avatarPreview)
      if (latestUrls.current.editorSrc) URL.revokeObjectURL(latestUrls.current.editorSrc)
    },
    []
  )

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
