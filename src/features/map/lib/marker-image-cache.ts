// 모임 핀 썸네일(원격 이미지)을 44px 흰 원 + 40px 원형 크롭으로 합성해 MapLibre addImage로
// 등록하고, URL별로 캐싱한다. 같은 URL이 동시에 여러 번 요청돼도 fetch는 한 번만 나간다.
//
// 그림자는 여기서 굽지 않는다 — marker-shadow 공유 레이어가 대신 그린다(설계 문서 참고).
// 생성자 파라미터 프로퍼티 축약 문법은 쓰지 않는다: node --test의 strip-only 모드가
// 지원하지 않아 ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX로 죽는다.

const THUMB_SIZE = 44
const THUMB_INNER_SIZE = 40

interface ThumbnailLoader {
  fetchBitmap: (url: string) => Promise<ImageBitmap>
  createCanvas: (size: number) => OffscreenCanvas
}

const defaultLoader: ThumbnailLoader = {
  fetchBitmap: async (url) => {
    // 표시용 이미지는 same-origin이라 CORS가 걸리지 않고, 쿠키 세션 인증이라 credentials가
    // 필요하다(src/lib/files/save-image.ts와 동일 관례).
    const response = await fetch(url, { credentials: "include" })
    if (!response.ok) throw new Error(`썸네일 요청 실패: ${response.status}`)
    const blob = await response.blob()
    return createImageBitmap(blob)
  },
  createCanvas: (size) => new OffscreenCanvas(size, size),
}

// object-fit: cover와 동일한 비율로 40px 원 안에 그린다.
function compositeThumbnail(bitmap: ImageBitmap, loader: ThumbnailLoader): ImageData {
  const canvas = loader.createCanvas(THUMB_SIZE)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d context를 만들 수 없습니다")

  ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE)
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(THUMB_SIZE / 2, THUMB_SIZE / 2, THUMB_SIZE / 2, 0, Math.PI * 2)
  ctx.fill()

  const inset = (THUMB_SIZE - THUMB_INNER_SIZE) / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(THUMB_SIZE / 2, THUMB_SIZE / 2, THUMB_INNER_SIZE / 2, 0, Math.PI * 2)
  ctx.clip()

  const scale = Math.max(THUMB_INNER_SIZE / bitmap.width, THUMB_INNER_SIZE / bitmap.height)
  const drawWidth = bitmap.width * scale
  const drawHeight = bitmap.height * scale
  const dx = inset + (THUMB_INNER_SIZE - drawWidth) / 2
  const dy = inset + (THUMB_INNER_SIZE - drawHeight) / 2
  ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight)
  ctx.restore()

  return ctx.getImageData(0, 0, THUMB_SIZE, THUMB_SIZE)
}

// maplibre-gl의 Map과 구조적으로 호환되는 최소 인터페이스 — 테스트에서 전체 Map을 흉내내지
// 않고 이 두 메서드만 가진 가짜 객체를 넘길 수 있게 한다.
interface MaplibreMapLike {
  hasImage(id: string): boolean
  addImage(id: string, image: ImageData): unknown
}

class MarkerImageCache {
  private readonly map: MaplibreMapLike
  private readonly loader: ThumbnailLoader
  private idsByUrl = new Map<string, string>()
  private pending = new Map<string, Promise<string>>()
  private nextId = 0

  constructor(map: MaplibreMapLike, loader: ThumbnailLoader = defaultLoader) {
    this.map = map
    this.loader = loader
  }

  /** 캐시에 있으면 즉시 imageId, 없으면 null을 주고 로딩을 시작한다 — 끝나면 onReady(imageId). */
  getOrLoad(url: string, onReady: (imageId: string) => void): string | null {
    const cached = this.idsByUrl.get(url)
    if (cached) return cached

    let promise = this.pending.get(url)
    if (!promise) {
      promise = this.load(url)
      this.pending.set(url, promise)
      const started = promise
      void started.catch(() => {}).finally(() => {
        if (this.pending.get(url) === started) this.pending.delete(url)
      })
    }

    promise.then(onReady).catch(() => {})
    return null
  }

  private async load(url: string): Promise<string> {
    const bitmap = await this.loader.fetchBitmap(url)
    const imageData = compositeThumbnail(bitmap, this.loader)
    const imageId = `pin-thumb-${this.nextId++}`
    if (!this.map.hasImage(imageId)) {
      this.map.addImage(imageId, imageData)
    }
    this.idsByUrl.set(url, imageId)
    return imageId
  }
}

export { MarkerImageCache, compositeThumbnail, THUMB_SIZE, THUMB_INNER_SIZE }
export type { ThumbnailLoader, MaplibreMapLike }
