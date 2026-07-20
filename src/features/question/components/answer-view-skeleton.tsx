import { Screen } from "@/components/layout/screen"
import { AppBar } from "@/components/ui/app-bar"
import { Skeleton } from "@/components/ui/skeleton"

// AnswerCard와 같은 골격 — 카드(rounded-xl bg-gray-50 px-3 py-4) 안에
// 아바타 44 + (작성자 / 부가정보) 헤더와 본문 문단.
// 로딩 중 화면이 `<div className="flex-1" />` 빈 칸이던 자리를 대신한다(issue #382).
const CARDS = [
  { author: "w-24", lines: ["w-full", "w-5/6"] },
  { author: "w-20", lines: ["w-full", "w-full", "w-2/3"] },
  { author: "w-28", lines: ["w-3/4"] },
]

function AnswerViewSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-1 flex-col gap-4 px-4 py-3">
      {CARDS.map((card, index) => (
        <div key={index} className="flex w-full flex-col gap-3 rounded-xl bg-gray-50 px-3 py-4">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-full bg-gray-100" />
              <div className="flex min-w-0 flex-col gap-1">
                <Skeleton className={`h-4 ${card.author}`} />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {card.lines.map((line, lineIndex) => (
              <Skeleton key={lineIndex} className={`h-3.5 ${line}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// 앱바까지 포함한 화면 전체 스켈레톤 — 라우트 Suspense fallback용.
// AnswerViewScreen 본체와 같은 main 골격을 써서 fallback → 본체 전환 시 헤더가 튀지 않는다.
function AnswerViewPageSkeleton() {
  return (
    <Screen kind="scroll" as="main" className="bg-white">
      <AppBar leadingIcon={null} trailingIcon={null} center={<Skeleton className="h-6 w-40" />} />
      <AnswerViewSkeleton />
    </Screen>
  )
}

export { AnswerViewSkeleton, AnswerViewPageSkeleton }
