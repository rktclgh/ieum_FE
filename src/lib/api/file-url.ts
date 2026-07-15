import { DEV_BACKEND_ORIGIN } from "@/lib/runtime/dev-backend-origin"

// 백엔드가 내려주는 파일 URL(`/api/v1/files/{id}`)은 same-origin 상대경로다.
// 프로덕션은 Spring이 정적 파일과 API를 같은 origin에서 서빙하므로 상대경로 그대로 로드된다.
// 로컬 dev는 FE(Next dev)와 BE(Spring) origin이 달라, <img>가 FE origin으로 요청하면 404가 난다.
// 이때만 apiClient와 동일한 DEV_BACKEND_ORIGIN(예: http://localhost:8080)을 prefix해 BE로 보낸다.
// (localhost 쿠키는 포트 무관이라 세션/인증도 그대로 실린다.)
function resolveFileUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  const path = url.startsWith("/") ? url : `/${url}`
  return DEV_BACKEND_ORIGIN ? `${DEV_BACKEND_ORIGIN}${path}` : path
}

export { resolveFileUrl }
