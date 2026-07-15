// react-easy-crop 의 cropAreaPixels 로 원본 이미지를 1:1 정사각형 canvas 에 그려 JPEG blob 을 추출한다.
// 긴 변을 1024px 로 제한해 10MB 이하를 보장한다.

const MAX_EDGE = 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (event) => reject(event))
    image.src = src
  })
}

interface CropPixels {
  x: number
  y: number
  width: number
  height: number
}

async function getCroppedBlob(imageSrc: string, cropPixels: CropPixels): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const edge = Math.min(cropPixels.width, MAX_EDGE)

  const canvas = document.createElement("canvas")
  canvas.width = edge
  canvas.height = edge

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D context unavailable")

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    edge,
    edge
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export cropped image"))),
      "image/jpeg",
      0.9
    )
  })
}

export { getCroppedBlob }
export type { CropPixels }
