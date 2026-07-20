import { TAB_ITEMS } from "@/features/navigation/constants/tab-items"

/** 탭바(tab-bar.tsx)와 동일한 정규화 규칙 — trailingSlash 설정 때문에 양쪽을 맞춰야 한다. */
const normalizePath = (path: string) => path.replace(/\/$/, "") || "/"

/** 탭 경로가 아니면 -1. */
export function findTabIndex(pathname: string): number {
  return TAB_ITEMS.findIndex((item) => normalizePath(item.href) === normalizePath(pathname))
}

/**
 * 탭 순서 기준 이동 방향.
 * - `forward`: 오른쪽 탭으로 이동 (홈 → 마이) → 새 화면이 오른쪽에서 들어온다
 * - `backward`: 왼쪽 탭으로 이동 (마이 → 홈) → 새 화면이 왼쪽에서 들어온다
 */
export type TabTransitionDirection = "forward" | "backward"

/**
 * 애니메이션을 걸지 말아야 하는 상황에서는 `null`을 반환한다.
 *
 * - `previousIndex === null`: 최초 진입·새로고침. 콜드 로드마다 화면이 미끄러지면 안 된다
 * - `nextIndex === -1`: 탭이 아닌 경로(`/friends`, `/chats/[id]` 등) — 탭 전환이 아니다
 * - 같은 탭 재선택
 */
export function resolveTabDirection(
  previousIndex: number | null,
  nextIndex: number
): TabTransitionDirection | null {
  if (nextIndex === -1 || previousIndex === null || previousIndex === nextIndex) return null
  return nextIndex > previousIndex ? "forward" : "backward"
}
