import { cookies } from "next/headers"

import type { UserMeResponse } from "@/features/session/api/session-api"

// 2층: 미들웨어가 넘긴 요청에 대해 실제로 users/me를 호출해 인증을 확정한다.
// 참고: Server Component 렌더링 중에는 쿠키를 다시 쓸 수 없어(Next.js 제약),
// access_token이 만료된 경우 refresh를 시도하지 않고 곧바로 비로그인으로 처리한다.
// (그 refresh-and-retry는 클라이언트 인터셉터(3층)가 이어서 담당한다.)
async function getMeServer(): Promise<UserMeResponse | null> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  if (!cookieHeader) return null

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/users/me`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    })

    if (!response.ok) return null
    return (await response.json()) as UserMeResponse
  } catch {
    // 백엔드 다운/네트워크 장애로 fetch 자체가 실패해도 서버 컴포넌트 렌더링은 계속되어야 한다.
    return null
  }
}

export { getMeServer }
