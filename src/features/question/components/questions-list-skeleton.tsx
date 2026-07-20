import { Skeleton } from "@/components/ui/skeleton"

// QuestionHistoryItem과 같은 골격 — 썸네일 72 + (제목 / 미리보기 / 시각).
// 기존에는 미리보기 한 줄만 펄스였고 목록 전체 로딩에는 아무것도 없었다(issue #382).
const ROWS = [
  { title: "w-40", preview: "w-3/4" },
  { title: "w-32", preview: "w-2/3" },
  { title: "w-48", preview: "w-5/6" },
  { title: "w-36", preview: "w-1/2" },
  { title: "w-44", preview: "w-3/4" },
  { title: "w-28", preview: "w-2/3" },
]

function QuestionsListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col">
      {ROWS.map((row, index) => (
        <div key={index} className="flex w-full items-center gap-3 py-3">
          <Skeleton className="size-[72px] shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={`h-4 ${row.title}`} />
            <Skeleton className={`h-3.5 ${row.preview}`} />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export { QuestionsListSkeleton }
