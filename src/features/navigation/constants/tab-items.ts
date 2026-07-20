import type { Messages } from "@/lib/i18n/messages/ko"
import { routes } from "@/lib/navigation/routes"

export interface TabItem {
  labelKey: keyof Messages["tabBar"]
  href: string
  icon: string
}

export const TAB_ITEMS: TabItem[] = [
  { labelKey: "home", href: routes.home(), icon: "home" },
  { labelKey: "chat", href: routes.chats(), icon: "chat" },
  { labelKey: "questions", href: routes.questions(), icon: "question" },
  { labelKey: "my", href: routes.my(), icon: "my" },
]

/**
 * trailing slash 유무로 일치가 깨지면 탭바가 통째로 사라지므로 양쪽을 정규화해 비교한다.
 * 여전히 완전 일치라 `/my/edit`은 `/my`와 매칭되지 않는다 — 하위 경로에 탭바가 새로 생기면 안 된다.
 */
const normalizePath = (path: string) => path.replace(/\/$/, "") || "/"

/** `TAB_ITEMS` 안에서의 위치. 탭 경로가 아니면 -1. */
export function findTabIndex(pathname: string): number {
  return TAB_ITEMS.findIndex((item) => normalizePath(item.href) === normalizePath(pathname))
}

/**
 * 이 경로에 하단 탭바가 깔리는가 — issue #419.
 *
 * **탭바 자신과 `Screen`이 같은 함수를 본다.** 이전에는 탭바가 자기 표시 여부를 판단하고
 * 각 페이지가 `pb-[calc(7rem+var(--safe-area-bottom))]`로 클리어런스를 따로 박아, 라우트가
 * 늘면 두 곳을 고쳐야 했다. 실제로 질문 탭은 최상위에 클리어런스가 빠져 있었다.
 */
export function isTabRoute(pathname: string): boolean {
  return findTabIndex(pathname) !== -1
}
