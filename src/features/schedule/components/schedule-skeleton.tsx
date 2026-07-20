import { Screen } from "@/components/layout/screen"
import { AppBar } from "@/components/ui/app-bar"
import { Skeleton } from "@/components/ui/skeleton"

// ScheduleListItem과 같은 골격 — 상대시각 pill + (제목 / 시각 / 장소) + 더보기 버튼.
// 카드 배경(bg-gray-50)과 라운드는 로딩 중에도 그려 카드 경계가 먼저 자리잡게 한다.
const CARDS = [{ title: "w-40" }, { title: "w-32" }, { title: "w-48" }]

function ScheduleListSkeleton() {
  return (
    <>
      {CARDS.map((card, index) => (
        <div
          key={index}
          aria-busy="true"
          className="flex w-full items-start gap-3 rounded-2xl bg-gray-50 p-3"
        >
          <Skeleton className="h-[25px] w-14 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className={`h-5 ${card.title}`} />
            {/* 시각 / 장소 — 각각 18px 아이콘 + 텍스트 */}
            <span className="flex items-center gap-1">
              <Skeleton className="size-[18px] shrink-0" />
              <Skeleton className="h-4 w-24" />
            </span>
            <span className="flex items-center gap-1">
              <Skeleton className="size-[18px] shrink-0" />
              <Skeleton className="h-4 w-32" />
            </span>
          </div>
          <Skeleton className="size-5 shrink-0" />
        </div>
      ))}
    </>
  )
}

// 캘린더까지 포함한 화면 전체 스켈레톤 — 방/모임 조회가 끝나기 전 단계에서 쓴다.
// 이 시점엔 어떤 달을 보여줄지도 정해지지 않아 날짜 숫자 대신 셀 자리만 그린다.
const WEEK_ROWS = 5
const DAYS_PER_WEEK = 7

function SchedulePageSkeleton() {
  return (
    <Screen kind="fixed" aria-busy="true" className="bg-white">
      {/* AppBar를 직접 흉내 내지 않고 그대로 쓴다 — 상태바 인셋까지 같아야 헤더가 튀지 않는다. */}
      <AppBar
        leadingIcon={null}
        trailingIcon={null}
        center={<Skeleton className="h-6 w-28" />}
        className="shrink-0"
      />

      <div className="flex flex-1 flex-col gap-6 overflow-hidden pt-2">
        <div className="flex w-full flex-col gap-5 px-4">
          <div className="flex items-center justify-between">
            {Array.from({ length: DAYS_PER_WEEK }, (_, index) => (
              <Skeleton key={index} className="h-4 w-7" />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: WEEK_ROWS }, (_, weekIndex) => (
              <div key={weekIndex} className="flex items-start justify-between">
                {Array.from({ length: DAYS_PER_WEEK }, (_, dayIndex) => (
                  <Skeleton key={dayIndex} className="size-7 rounded-full" />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4">
          <ScheduleListSkeleton />
        </div>
      </div>
    </Screen>
  )
}

export { ScheduleListSkeleton, SchedulePageSkeleton }
