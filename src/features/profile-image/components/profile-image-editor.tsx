"use client"

import * as React from "react"
import Cropper, { type Area } from "react-easy-crop"

import { Button } from "@/components/ui/button"
import { FullScreenOverlay } from "@/components/ui/full-screen-overlay"
import { getCroppedBlob } from "@/features/profile-image/lib/crop-image"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ProfileImageEditorProps {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onCropped: (blob: Blob) => void
}

/**
 * 풀스크린 원형 크롭 오버레이. 네트워크 호출 없이 크롭된 blob 만 onCropped 로 방출한다.
 * 이미지가 바뀌면 crop/zoom 상태를 새로 시작해야 하므로 Content를 imageSrc로 keying 한다
 * (예전에는 호출부가 key를 걸었지만, 그러면 닫힐 때 오버레이째 리마운트돼 퇴장 모션이 사라진다).
 */
function ProfileImageEditor({ open, imageSrc, onClose, onCropped }: ProfileImageEditorProps) {
  return (
    <FullScreenOverlay open={open && imageSrc !== null} className="z-50 flex flex-col bg-white">
      {imageSrc ? (
        <ProfileImageEditorContent
          key={imageSrc}
          imageSrc={imageSrc}
          onClose={onClose}
          onCropped={onCropped}
        />
      ) : null}
    </FullScreenOverlay>
  )
}

interface ProfileImageEditorContentProps {
  imageSrc: string
  onClose: () => void
  onCropped: (blob: Blob) => void
}

function ProfileImageEditorContent({ imageSrc, onClose, onCropped }: ProfileImageEditorContentProps) {
  const { messages } = useTranslation()
  const t = messages.profileImage
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [areaPixels, setAreaPixels] = React.useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const handleCropComplete = React.useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!areaPixels) return
    setIsProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels)
      onCropped(blob)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          style={{
            containerStyle: { backgroundColor: "#ffffff" },
            // 흰 배경에서는 기본 흰색 테두리가 보이지 않는다. 밝은 사진에서도 크롭 경계가
            // 식별되도록 회색 테두리로 바꾼다(리뷰 반영).
            cropAreaStyle: {
              boxShadow: "0 0 0 9999em rgba(255, 255, 255, 0.75)",
              border: "1px solid rgba(31, 35, 36, 0.24)",
            },
          }}
        />
      </div>
      <div className="flex items-center gap-2 bg-white px-4 py-4 pb-[calc(1rem+var(--safe-area-bottom))]">
        <Button variant="grayscale" onClick={onClose} className="h-11 flex-1">
          {t.cropCancel}
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isProcessing || !areaPixels}
          className="h-11 flex-1"
        >
          {t.cropConfirm}
        </Button>
      </div>
    </>
  )
}

export { ProfileImageEditor }
