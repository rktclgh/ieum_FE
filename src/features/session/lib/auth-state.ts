type AuthState<TUser> =
  | { kind: "loading" }
  | { kind: "authenticated"; user: TUser }
  | { kind: "guest" }
  | { kind: "backend-down"; error: unknown }

interface AuthSnapshot<TUser> {
  isPending?: boolean
  data?: TUser | null
  backendUnavailableError?: unknown
}

function resolveAuthState<TUser>(snapshot: AuthSnapshot<TUser>): AuthState<TUser> {
  if (snapshot.data !== undefined && snapshot.data !== null) {
    return { kind: "authenticated", user: snapshot.data }
  }

  if (snapshot.isPending) {
    return { kind: "loading" }
  }

  if (
    snapshot.backendUnavailableError !== undefined &&
    snapshot.backendUnavailableError !== null
  ) {
    return { kind: "backend-down", error: snapshot.backendUnavailableError }
  }

  if (snapshot.data === null) {
    return { kind: "guest" }
  }

  return { kind: "loading" }
}

export { resolveAuthState }
export type { AuthSnapshot, AuthState }
