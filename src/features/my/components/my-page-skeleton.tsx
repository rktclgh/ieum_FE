import { Skeleton } from "@/components/ui/skeleton"

// MyPageContent와 같은 골격 — 프로필(아바타 96 + 닉네임 + 국기) + 메뉴 카드 + 계정 카드.
// 실제 화면은 useMe가 resolve될 때까지 통째로 비어 있었다(issue #382).
//
// 메뉴 행은 MyMenuRow와 같은 h-10 / pl-4 pr-3 를 쓴다. 카드 배경(bg-gray-50)과
// 라운드는 로딩 중에도 그대로 그려 두 카드의 경계가 먼저 자리를 잡게 한다.
const MENU_LABEL_WIDTHS = ["w-20", "w-24", "w-16", "w-20", "w-28"]
const ACCOUNT_LABEL_WIDTHS = ["w-16", "w-20"]

function MenuRowSkeleton({ labelWidth }: { labelWidth: string }) {
  return (
    <span className="flex h-10 w-full items-center justify-between py-2 pl-4 pr-3">
      <span className="flex items-center gap-2">
        <Skeleton className="size-5 shrink-0" />
        <Skeleton className={`h-4 ${labelWidth}`} />
      </span>
      <Skeleton className="size-5 shrink-0" />
    </span>
  )
}

function MyPageSkeleton() {
  return (
    <main
      aria-busy="true"
      className="app-column flex min-h-dvh flex-col items-center px-4 pb-[calc(7rem+var(--safe-area-bottom))]"
    >
      <div className="flex flex-col items-center gap-3 pt-[calc(2rem+var(--safe-area-top))] pb-6">
        <Skeleton className="size-24 rounded-full" />
        {/* 닉네임 + 연필 아이콘 */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="size-4 shrink-0" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full flex-col gap-2 rounded-2xl bg-gray-50 py-3">
          {MENU_LABEL_WIDTHS.map((width, index) => (
            <MenuRowSkeleton key={index} labelWidth={width} />
          ))}
        </div>

        <div className="flex w-full flex-col gap-1 rounded-2xl bg-gray-50 py-3">
          {ACCOUNT_LABEL_WIDTHS.map((width, index) => (
            // 계정 카드 행은 아이콘 없이 라벨만 있고 px-4 py-2 다.
            <span key={index} className="flex w-full items-center px-4 py-2">
              <Skeleton className={`h-4 ${width}`} />
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}

export { MyPageSkeleton }
