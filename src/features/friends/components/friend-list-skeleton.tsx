import { Skeleton } from "@/components/ui/skeleton"

// FriendRequestItem과 같은 골격 — 아바타 44 + (이름 / 국기) + 우측 액션 버튼.
// 친구 행에는 버튼이 없고 요청 행에만 있으므로, 버튼 자리는 showAction으로 켠다.
const NAME_WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-36", "w-24"]

interface FriendListSkeletonProps {
  rows?: number
  /** 우측 액션 버튼(수락/거절 등) 자리를 함께 그릴지 — 받은 요청 섹션에서 켠다. */
  showAction?: boolean
}

function FriendListSkeleton({ rows = 6, showAction = false }: FriendListSkeletonProps) {
  return (
    <div aria-busy="true" className="flex flex-col">
      {NAME_WIDTHS.slice(0, rows).map((nameWidth, index) => (
        <div key={index} className="flex w-full items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className={`h-4 ${nameWidth}`} />
              {/* CountryFlag — 국기(16) + 국가명 */}
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
          {/* PillButton: rounded-lg px-3 py-2 text-13 → 대략 33px 높이 */}
          {showAction && <Skeleton className="h-[33px] w-16 shrink-0 rounded-lg" />}
        </div>
      ))}
    </div>
  )
}

export { FriendListSkeleton }
