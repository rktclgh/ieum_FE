// 백엔드가 내려주는 파일 URL(`/api/v1/files/{id}`)은 상대 경로다. FE와 백엔드 도메인이
// 다르므로 API base URL을 붙여 절대 URL로 만든다. (이미 절대 URL이면 그대로 둔다.)
// 주의: 파일 조회는 세션 쿠키가 필요하다 — 크로스 오리진 <img> 쿠키 전송은 백엔드 쿠키
// 정책(SameSite=None; Secure)에 달려 있다.
function resolveFileUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
  return `${base}${url}`
}

export { resolveFileUrl }
