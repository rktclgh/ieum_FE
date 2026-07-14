type RefreshFailure = "expired" | "backend-down"

interface RefreshRetryRequest {
  _retried?: boolean
}

function classifyRefreshFailure(status?: number): RefreshFailure {
  return status === 401 || status === 403 ? "expired" : "backend-down"
}

function claimRefreshRetry<TRequest extends object>(
  request: TRequest & RefreshRetryRequest,
) {
  if (request._retried === true) {
    return false
  }

  request._retried = true
  return true
}

export { claimRefreshRetry, classifyRefreshFailure }
export type { RefreshFailure, RefreshRetryRequest }
