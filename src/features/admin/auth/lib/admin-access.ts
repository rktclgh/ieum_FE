import type { AuthState } from "../../../session/lib/auth-state.js"
import type { UserRole } from "../../../session/types/user-role.js"

type AdminGatePolicy = "protected" | "login"
type AdminGateDecision =
  | "loading"
  | "backend-down"
  | "redirect-login"
  | "redirect-home"
  | "forbidden"
  | "allow"

interface AdminGateUser {
  role: UserRole
}

function resolveAdminGateDecision(
  policy: AdminGatePolicy,
  state: AuthState<AdminGateUser>,
): AdminGateDecision {
  if (state.kind === "loading" || state.kind === "refreshing") {
    return "loading"
  }

  if (state.kind === "backend-down") {
    return "backend-down"
  }

  if (state.kind === "guest") {
    return policy === "protected" ? "redirect-login" : "allow"
  }

  if (state.user.role !== "admin") {
    return "forbidden"
  }

  return policy === "login" ? "redirect-home" : "allow"
}

export { resolveAdminGateDecision }
export type { AdminGateDecision, AdminGatePolicy, AdminGateUser }
