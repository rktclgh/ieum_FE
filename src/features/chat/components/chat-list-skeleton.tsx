import { Skeleton } from "@/components/ui/skeleton"

// ChatListItem과 같은 골격 — 아바타 44 + (제목 / 마지막 메시지) + 우측 시각.
// 행 높이(py-3 + 아바타 44)를 맞춰 두면 목록이 도착해도 세로 위치가 튀지 않는다.
// 폭은 랜덤이 아니라 고정 패턴이다. 렌더마다 값이 흔들리면 리렌더 때 바 길이가
// 바뀌어 오히려 시선을 끈다.
const ROWS = [
  { title: "w-24", message: "w-44" },
  { title: "w-32", message: "w-52" },
  { title: "w-20", message: "w-36" },
  { title: "w-28", message: "w-48" },
  { title: "w-36", message: "w-40" },
  { title: "w-24", message: "w-32" },
]

function ChatListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col">
      {ROWS.map((row, index) => (
        <div key={index} className="flex w-full items-center gap-3 py-3">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={`h-4 ${row.title}`} />
            <Skeleton className={`h-3.5 ${row.message}`} />
          </div>
          {/* 실제 행의 우측 열은 h-11에 시각을 위쪽 정렬로 붙인다. */}
          <Skeleton className="h-3 w-8 shrink-0 self-start" />
        </div>
      ))}
    </div>
  )
}

export { ChatListSkeleton }
