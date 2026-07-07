import { NextResponse, type NextRequest } from "next/server"

const ACCESS_TOKEN_COOKIE = "access_token"
const GUEST_ONLY_PATHS = ["/login", "/join"]
const PROTECTED_PATHS = ["/my"]

// startsWith만 쓰면 /login-success, /login/callback 같은 경로까지 오매칭되므로
// 정확히 일치하거나 그 하위 경로("/path/...")인 경우만 매칭한다.
function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

// 1층: 쿠키 "존재 여부"만 보는 값싼 필터. 진짜 유효성 검증(2층)은 각 페이지의
// 서버 컴포넌트가 users/me를 호출해서 확정한다 — 여기서 하면 모든 이동에 왕복이 붙는다.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value)

  const isGuestOnlyPath = GUEST_ONLY_PATHS.some((path) => matchesPath(pathname, path))
  if (isGuestOnlyPath && hasAccessToken) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const isProtectedPath = PROTECTED_PATHS.some((path) => matchesPath(pathname, path))
  if (isProtectedPath && !hasAccessToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/join", "/my/:path*"],
}
