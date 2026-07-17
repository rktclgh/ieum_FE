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
  | "ios-install-required"
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
  iosInstallRequired: boolean
}

interface IosInstallGateInput {
  userAgent: string
  maxTouchPoints: number
  standalone: boolean | undefined
  displayModeStandalone: boolean
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

// iOS exposes the Push API only to home screen apps, so an uninstalled visitor
// looks identical to a browser that will never support push. Separating the two
// is what lets the UI offer installation instead of giving up.
function isIosInstallRequired({
  userAgent,
  maxTouchPoints,
  standalone,
  displayModeStandalone,
}: IosInstallGateInput) {
  // iPadOS 13+ reports a desktop Safari user agent; touch points are the only tell.
  const isIos =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) &&
      /Safari/.test(userAgent) &&
      !/Chrome|Chromium/.test(userAgent) &&
      maxTouchPoints > 1)
  if (!isIos) return false
  return standalone !== true && !displayModeStandalone
}

function readIosInstallGate() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false

  return isIosInstallRequired({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    displayModeStandalone:
      window.matchMedia?.("(display-mode: standalone)").matches ?? false,
  })
}

function unsupportedWebPushStatus(): WebPushStatus {
  return readIosInstallGate() ? "ios-install-required" : "unsupported"
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

async function registerWebPushServiceWorker() {
  const container = serviceWorkerContainer()
  await container.register("/sw.js", { scope: "/" })
  return container.ready
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

interface ReconcileStartInput {
  userId: number | undefined
  notifyAll: boolean | undefined
  supported: boolean
  permission: NotificationPermission
}

interface ReconcileUpsertInput {
  serverEnabled: boolean
  hasBrowserSubscription: boolean
  backendSubscribed: boolean
}

function shouldStartWebPushReconcile({
  userId,
  notifyAll,
  supported,
  permission,
}: ReconcileStartInput) {
  return Boolean(userId) && notifyAll === true && supported && permission === "granted"
}

// `backendSubscribed` is deliberately accepted and ignored. The backend answers it
// for the user+session pair rather than for a specific endpoint, so it stays true
// while a rotated endpoint rots — precisely the case reconcile has to repair.
// Re-upserting is safe because the backend upsert is idempotent on endpoint_hash.
function shouldUpsertReconciledSubscription({
  serverEnabled,
  hasBrowserSubscription,
}: ReconcileUpsertInput) {
  return serverEnabled && hasBrowserSubscription
}

function resolveWebPushStatus({
  supported,
  serverEnabled,
  permission,
  backendSubscribed,
  browserSubscribed,
  iosInstallRequired,
}: WebPushStatusInput): WebPushStatus {
  if (!supported) return iosInstallRequired ? "ios-install-required" : "unsupported"
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
  isIosInstallRequired,
  isWebPushSupported,
  readIosInstallGate,
  registerWebPushServiceWorker,
  resolveWebPushStatus,
  shouldStartWebPushReconcile,
  shouldUpsertReconciledSubscription,
  toWebPushSubscriptionRequest,
  unsupportedWebPushStatus,
  urlBase64ToUint8Array,
}
export type {
  IosInstallGateInput,
  ReconcileStartInput,
  ReconcileUpsertInput,
  WebPushStatus,
  WebPushStatusInput,
  WebPushSubscriptionRequest,
}
