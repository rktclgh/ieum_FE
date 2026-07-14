"use client"

import * as React from "react"
import Cropper, { type Area } from "react-easy-crop"

import { Button } from "@/components/ui/button"
import { getCroppedBlob } from "@/features/profile-image/lib/crop-image"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ProfileImageEditorProps {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onCropped: (blob: Blob) => void
}

// 풀스크린 원형 크롭 오버레이. 네트워크 호출 없이 크롭된 blob 만 onCropped 로 방출한다.
function ProfileImageEditor({ open, imageSrc, onClose, onCropped }: ProfileImageEditorProps) {
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
    if (!imageSrc || !areaPixels) return
    setIsProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels)
      onCropped(blob)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  if (!open || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
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
        />
      </div>
      <div className="flex items-center justify-between gap-3 bg-black px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-white">
          {t.cropCancel}
        </Button>
        <Button onClick={handleConfirm} disabled={isProcessing || !areaPixels} className="flex-1">
          {t.cropConfirm}
        </Button>
      </div>
    </div>
  )
}

export { ProfileImageEditor }
