type SessionExpiredListener = () => void

const sessionExpiredListeners = new Set<SessionExpiredListener>()

function notifySessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener())
}

function subscribeSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListeners.add(listener)

  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

export { notifySessionExpired, subscribeSessionExpired }
