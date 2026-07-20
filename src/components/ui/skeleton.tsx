import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 로딩 중 콘텐츠 자리를 지키는 회색 바 — issue #382.
 *
 * 실제 콘텐츠와 같은 높이·간격으로 배치해야 데이터 도착 시 레이아웃이 튀지 않는다.
 * 그래서 이 컴포넌트는 크기를 스스로 정하지 않고 호출부가 className으로 지정한다.
 *
 * 스크린리더에는 의미 없는 도형이라 항상 aria-hidden이다. "로딩 중"이라는 사실은
 * 개별 바가 아니라 이 바들을 감싸는 화면별 스켈레톤 루트의 aria-busy가 알린다.
 *
 * prefers-reduced-motion에서도 pulse를 끄지 않는다. globals.css의 모션 토큰 주석대로
 * 로딩 인디케이터(spin/pulse/shimmer)는 상태 전환 모션과 축이 달라 감속 대상이 아니다.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded bg-gray-100", className)}
      {...props}
    />
  )
}

export { Skeleton }
