import { Skeleton } from "@/components/ui/skeleton"

// NotificationItem과 같은 골격 — (배지 + 제목) / 본문 / 시각 세로 스택, p-4 gap-1.5.
// 배지는 실제로도 있을 때만 그려지므로 일부 행에서만 켠다.
const ROWS = [
  { badge: true, title: "w-32", body: "w-full" },
  { badge: false, title: "w-40", body: "w-3/4" },
  { badge: true, title: "w-28", body: "w-5/6" },
  { badge: false, title: "w-36", body: "w-2/3" },
  { badge: false, title: "w-24", body: "w-full" },
  { badge: true, title: "w-32", body: "w-3/4" },
]

function NotificationListSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col">
      {ROWS.map((row, index) => (
        <div key={index} className="flex w-full flex-col items-start gap-1.5 p-4">
          <span className="flex max-w-full items-center gap-2">
            {row.badge && <Skeleton className="h-[21px] w-12 shrink-0 rounded-full" />}
            <Skeleton className={`h-3.5 ${row.title}`} />
          </span>
          <Skeleton className={`h-4 ${row.body}`} />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  )
}

export { NotificationListSkeleton }
