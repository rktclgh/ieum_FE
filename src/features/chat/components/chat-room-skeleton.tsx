import { Screen } from "@/components/layout/screen"
import { AppBar } from "@/components/ui/app-bar"
import { Skeleton } from "@/components/ui/skeleton"

// ChatBubble과 같은 골격 — 좌(상대)/우(나) 교대 말풍선.
// 상대 말풍선에만 아바타와 이름이 붙는다.
//
// 말풍선 폭은 고정 패턴이다. 실제 대화 길이는 알 수 없으므로 길고 짧은 것을 섞어
// "대화가 있다"는 리듬만 만든다. 랜덤이면 리렌더마다 길이가 흔들려 시선을 끈다.
const BUBBLES = [
  { mine: false, width: "w-40", tall: false },
  { mine: true, width: "w-32", tall: false },
  { mine: false, width: "w-56", tall: true },
  { mine: true, width: "w-44", tall: true },
  { mine: false, width: "w-36", tall: false },
  { mine: true, width: "w-28", tall: false },
]

// AppBar를 직접 흉내 내지 않고 그대로 쓴다 — 상태바 인셋(APP_BAR_SAFE_TOP)까지 같은 값이라야
// 스켈레톤에서 실제 화면으로 넘어갈 때 헤더가 위아래로 튀지 않는다.
// leadingIcon/trailingIcon을 null로 두면 동작하지 않는 버튼 대신 같은 크기의 빈 자리가 들어간다.
function ChatRoomSkeleton() {
  return (
    <Screen kind="fixed" as="main" aria-busy="true" className="bg-white">
      <AppBar
        leadingIcon={null}
        trailingIcon={null}
        center={<Skeleton className="h-6 w-32" />}
        className="border-b border-gray-50 bg-white"
      />

      {/* 대화는 아래쪽부터 쌓이므로 justify-end로 붙여 실제 화면과 같은 위치에서 시작한다. */}
      <div className="flex min-h-0 flex-1 flex-col justify-end px-4 pb-3">
        {BUBBLES.map((bubble, index) => (
          <div
            key={index}
            className={`flex w-full items-end gap-2 py-2 ${bubble.mine ? "justify-end" : ""}`}
          >
            {!bubble.mine && <Skeleton className="size-9 shrink-0 rounded-full" />}
            <div
              className={`flex max-w-[75%] flex-col gap-1 ${bubble.mine ? "items-end" : "items-start"}`}
            >
              {!bubble.mine && <Skeleton className="h-3 w-16" />}
              <Skeleton className={`${bubble.width} ${bubble.tall ? "h-14" : "h-9"} rounded-2xl`} />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>

      {/* 입력창 자리 — 첨부 / 입력 / 전송 */}
      <div className="flex shrink-0 items-center gap-2 border-t border-gray-50 px-4 py-3 pb-[calc(0.75rem+var(--safe-area-bottom))]">
        <Skeleton className="size-6 shrink-0" />
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="size-6 shrink-0" />
      </div>
    </Screen>
  )
}

export { ChatRoomSkeleton }
