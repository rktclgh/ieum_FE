import { resolveFileUrl } from "@/lib/api/file-url"

/**
 * 모바일 웹에서 사진 앱(갤러리)에 직접 쓰는 API 는 없다.
 * - iOS Safari: <a download> 는 '파일' 앱으로 떨어진다. 사진 앱에 넣는 유일한 경로가 공유시트다.
 * - Android Chrome: 공유시트가 되면 공유시트, 아니면 '다운로드' 폴더로 받는다.
 * 그래서 canShare 가 참일 때만 공유시트를 쓰고 나머지는 다운로드로 폴백한다.
 */
type SaveImageResult = "shared" | "downloaded" | "cancelled" | "failed"

const FALLBACK_BASENAME = "ieum-photo"

function extensionFromMimeType(mimeType: string): string {
  const subtype = mimeType.split("/")[1]?.split(";")[0]?.trim()
  if (!subtype) return "jpg"
  return subtype === "jpeg" ? "jpg" : subtype
}

function imageFileName(url: string, mimeType: string): string {
  const path = url.split("?")[0].split("#")[0]
  const lastSegment = path.split("/").filter(Boolean).pop() ?? ""
  if (/\.[a-z0-9]{2,5}$/i.test(lastSegment)) return lastSegment
  return `${FALLBACK_BASENAME}.${extensionFromMimeType(mimeType)}`
}

function downloadFile(file: File) {
  const objectUrl = URL.createObjectURL(file)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // click 직후 곧바로 revoke 하면 일부 브라우저가 다운로드를 시작하지 못한다.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}

async function saveImage(url: string): Promise<SaveImageResult> {
  const resolved = resolveFileUrl(url)
  if (!resolved) return "failed"

  let file: File
  try {
    // 표시용 이미지는 same-origin 이라 CORS 가 걸리지 않고, 쿠키 세션 인증이라 credentials 가 필요하다.
    const response = await fetch(resolved, { credentials: "include" })
    if (!response.ok) return "failed"
    const blob = await response.blob()
    file = new File([blob], imageFileName(resolved, blob.type), { type: blob.type })
  } catch {
    return "failed"
  }

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return "shared"
    } catch (error) {
      // 사용자가 공유시트를 닫은 것은 실패가 아니다. 실패 배너를 띄우면 안 된다.
      if (error instanceof Error && error.name === "AbortError") return "cancelled"
      return "failed"
    }
  }

  try {
    downloadFile(file)
    return "downloaded"
  } catch {
    return "failed"
  }
}

export { imageFileName, saveImage }
export type { SaveImageResult }
