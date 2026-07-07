import { NextResponse, type NextRequest } from "next/server"

const ACCESS_TOKEN_COOKIE = "access_token"
const GUEST_ONLY_PATHS = ["/login", "/join"]
const PROTECTED_PATHS = ["/my"]

// 1층: 쿠키 "존재 여부"만 보는 값싼 필터. 진짜 유효성 검증(2층)은 각 페이지의
// 서버 컴포넌트가 users/me를 호출해서 확정한다 — 여기서 하면 모든 이동에 왕복이 붙는다.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value)

  const isGuestOnlyPath = GUEST_ONLY_PATHS.some((path) => pathname.startsWith(path))
  if (isGuestOnlyPath && hasAccessToken) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path))
  if (isProtectedPath && !hasAccessToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/join", "/my/:path*"],
}
