interface WebPushSubscriptionRequest {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

type WebPushStatus =
  | "unsupported"
  | "server-disabled"
  | "permission-denied"
  | "subscribed"
  | "unsubscribed"

interface WebPushStatusInput {
  supported: boolean
  serverEnabled: boolean
  permission: NotificationPermission
  backendSubscribed: boolean
  browserSubscribed: boolean
}

function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  )
}

function urlBase64ToUint8Array(value: string) {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) {
    throw new TypeError("VAPID public key must be URL-safe base64")
  }

  const withoutPadding = value.replace(/=+$/, "")
  if (withoutPadding.length % 4 === 1) {
    throw new TypeError("VAPID public key must be valid base64")
  }

  const padded = withoutPadding.padEnd(
    withoutPadding.length + ((4 - (withoutPadding.length % 4)) % 4),
    "=",
  )
  const decoded = globalThis.atob(
    padded.replace(/-/g, "+").replace(/_/g, "/"),
  )

  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

function toWebPushSubscriptionRequest(
  subscription: PushSubscriptionJSON,
): WebPushSubscriptionRequest {
  const endpoint = subscription.endpoint?.trim()
  if (!endpoint) {
    throw new TypeError("Push subscription endpoint is required")
  }

  const p256dh = subscription.keys?.p256dh?.trim()
  const auth = subscription.keys?.auth?.trim()
  if (!p256dh || !auth) {
    throw new TypeError("Push subscription encryption keys are required")
  }

  const expirationTime = subscription.expirationTime ?? null
  if (
    expirationTime !== null &&
    (!Number.isSafeInteger(expirationTime) || expirationTime < 0)
  ) {
    throw new TypeError("Push subscription expiration time is invalid")
  }

  return {
    endpoint,
    expirationTime,
    keys: { p256dh, auth },
  }
}

function serviceWorkerContainer() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service Worker is not supported")
  }
  return navigator.serviceWorker
}

function registerWebPushServiceWorker() {
  return serviceWorkerContainer().register("/sw.js", { scope: "/" })
}

async function getExistingWebPushSubscription(
  registration?: ServiceWorkerRegistration,
) {
  const resolved =
    registration ?? (await serviceWorkerContainer().getRegistration("/"))
  return resolved ? resolved.pushManager.getSubscription() : null
}

async function createOrReuseWebPushSubscription(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
) {
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
}

function resolveWebPushStatus({
  supported,
  serverEnabled,
  permission,
  backendSubscribed,
  browserSubscribed,
}: WebPushStatusInput): WebPushStatus {
  if (!supported) return "unsupported"
  if (!serverEnabled) return "server-disabled"
  if (permission === "denied") return "permission-denied"
  if (
    permission === "granted" &&
    backendSubscribed &&
    browserSubscribed
  ) {
    return "subscribed"
  }
  return "unsubscribed"
}

export {
  createOrReuseWebPushSubscription,
  getExistingWebPushSubscription,
  isWebPushSupported,
  registerWebPushServiceWorker,
  resolveWebPushStatus,
  toWebPushSubscriptionRequest,
  urlBase64ToUint8Array,
}
export type {
  WebPushStatus,
  WebPushStatusInput,
  WebPushSubscriptionRequest,
}
