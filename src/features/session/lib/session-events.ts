type SessionExpiredListener = () => void
type RefreshState = "idle" | "refreshing"

let refreshState: RefreshState = "idle"
const refreshListeners = new Set<() => void>()
const sessionExpiredListeners = new Set<SessionExpiredListener>()

function setRefreshState(next: RefreshState) {
  if (refreshState === next) return

  refreshState = next
  refreshListeners.forEach((listener) => listener())
}

const refreshStore = {
  getSnapshot: () => refreshState,
  getServerSnapshot: (): RefreshState => "idle",
  subscribe(listener: () => void) {
    refreshListeners.add(listener)
    return () => refreshListeners.delete(listener)
  },
}

function notifySessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener())
}

function subscribeSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListeners.add(listener)

  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

export {
  notifySessionExpired,
  refreshStore,
  setRefreshState,
  subscribeSessionExpired,
}
