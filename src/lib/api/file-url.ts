// 백엔드가 내려주는 파일 URL(`/api/v1/files/{id}`)은 same-origin 경로로 둔다.
// Next rewrite가 백엔드로 넘기므로 PWA/WebKit에서도 쿠키가 1st-party로 전송된다.
function resolveFileUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  return url.startsWith("/") ? url : `/${url}`
}

export { resolveFileUrl }
