function resolveDevBackendOrigin(
  nodeEnv: string | undefined,
  configuredOrigin: string | undefined
): string | undefined {
  if (nodeEnv !== "development") return undefined

  const trimmedOrigin = configuredOrigin?.trim() || "http://localhost:8080"

  const url = new URL(trimmedOrigin)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError(`Development backend origin must use HTTP or HTTPS: ${trimmedOrigin}`)
  }

  return url.origin
}

const DEV_BACKEND_ORIGIN =
  process.env.NODE_ENV === "development"
    ? resolveDevBackendOrigin(
        "development",
        process.env.NEXT_PUBLIC_DEV_BACKEND_ORIGIN
      )
    : undefined

function toWebSocketUrl(origin: string): string {
  const url = new URL("/ws", origin)

  if (url.protocol === "http:") {
    url.protocol = "ws:"
  } else if (url.protocol === "https:") {
    url.protocol = "wss:"
  } else {
    throw new TypeError(`WebSocket origin must use HTTP or HTTPS: ${origin}`)
  }

  return url.toString()
}

export { DEV_BACKEND_ORIGIN, resolveDevBackendOrigin, toWebSocketUrl }
