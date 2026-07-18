type RequireAuthStatus = "authenticated" | "guest" | "unresolved"
type RequireAuthOutcome = "run" | "prompt" | "ignore"

interface MeSnapshot {
  /** useMe().data — 객체면 로그인, null이면 게스트, undefined면 미확정 */
  data: unknown
  /** useMe().isPending — 최초 조회 진행 중 */
  isPending: boolean
}

// 로그인 데이터가 있으면 재검증(isPending) 중이어도 authenticated로 본다.
function toRequireAuthStatus(snapshot: MeSnapshot): RequireAuthStatus {
  if (snapshot.data !== undefined && snapshot.data !== null) return "authenticated"
  if (snapshot.isPending) return "unresolved"
  return "guest"
}

function decideRequireAuth(status: RequireAuthStatus): RequireAuthOutcome {
  if (status === "authenticated") return "run"
  if (status === "guest") return "prompt"
  return "ignore"
}

export { toRequireAuthStatus, decideRequireAuth }
export type { RequireAuthStatus, RequireAuthOutcome, MeSnapshot }
