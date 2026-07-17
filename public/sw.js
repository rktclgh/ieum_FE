const NOTIFICATION_CENTER = "/notifications/"
const FALLBACK_TITLE = "새 알림"
const FALLBACK_BODY = "새 알림이 도착했어요"
const FALLBACK_TAG = "notification-fallback"
const SUBSCRIPTION_ENDPOINT = "/api/v1/notifications/push/subscription"
const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_HEADER_NAME = "X-CSRF-Token"

function safeDestination(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return NOTIFICATION_CENTER
  }

  try {
    const url = new URL(value, self.location.origin)
    if (url.origin !== self.location.origin || url.pathname.startsWith("//")) return NOTIFICATION_CENTER
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return NOTIFICATION_CENTER
  }
}

function nonEmptyString(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback
}

// 알림 type/refId 를 앱 내부 경로로 변환한다. 인앱 알림센터
// (src/features/notification/lib/notification-link.ts)와 동일한 규칙이므로 함께 유지한다.
// 매핑 불가하면 null 을 돌려 호출부가 알림센터로 폴백하게 한다.
function resolveNotificationDestination(type, refId) {
  if (typeof type !== "string") return null

  const normalized = type.toLowerCase()
  const id = Number.isSafeInteger(refId) && refId > 0 ? refId : null

  // 친구 요청은 "받은 친구요청" 목록으로 고정 이동한다(refId 불필요).
  // 요청자 userId(refId)가 유효하면 해당 요청 행을 강조하도록 넘긴다.
  if (normalized.includes("friend")) {
    return id === null ? "/friends/" : `/friends/?highlightUserId=${id}`
  }

  if (id === null) return null

  if (normalized.includes("question") || normalized.includes("answer")) {
    return `/questions/detail/?questionId=${id}`
  }
  if (normalized.includes("meet")) return `/meetups/detail/?meetingId=${id}`
  if (
    normalized.includes("chat") ||
    normalized.includes("message") ||
    normalized.includes("room")
  ) {
    return `/chats/room/?chatId=${id}`
  }
  return null
}

function fallbackNotification() {
  return {
    title: FALLBACK_TITLE,
    body: FALLBACK_BODY,
    tag: FALLBACK_TAG,
    url: NOTIFICATION_CENTER,
  }
}

function notificationFromPayload(payload) {
  if (!payload || payload.version !== 1) return fallbackNotification()

  if (payload.kind === "chat") {
    return {
      title: nonEmptyString(payload.title, FALLBACK_TITLE),
      body: nonEmptyString(payload.body, FALLBACK_BODY),
      tag: nonEmptyString(payload.tag, FALLBACK_TAG),
      url: safeDestination(payload.url),
    }
  }

  if (payload.kind === "notification") {
    const title = nonEmptyString(payload.title, FALLBACK_TITLE)
    const notificationId = Number.isSafeInteger(payload.notificationId) && payload.notificationId > 0
      ? payload.notificationId
      : null
    // type/refId 로 딥링크를 계산하고, 매핑 불가하면 알림센터로 폴백한다.
    const destination = resolveNotificationDestination(payload.type, payload.refId)
    return {
      title: payload.answerIsAi === true ? `AI · ${title}` : title,
      body: nonEmptyString(payload.body, FALLBACK_BODY),
      tag: notificationId === null ? FALLBACK_TAG : `notification-${notificationId}`,
      url: destination === null ? NOTIFICATION_CENTER : safeDestination(destination),
    }
  }

  return fallbackNotification()
}

async function showPushNotification(event) {
  let payload = null
  try {
    payload = event.data ? event.data.json() : null
  } catch {
    payload = null
  }

  const notification = notificationFromPayload(payload)
  await self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: "/icons/pwa/icon-192.png",
    tag: notification.tag,
    data: { url: notification.url },
  })
}

async function openNotificationDestination(value) {
  const destination = safeDestination(value)
  const target = new URL(destination, self.location.origin)
  const targetUrl = target.origin === self.location.origin
    ? target.href
    : new URL(NOTIFICATION_CENTER, self.location.origin).href
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  const exactClient = windowClients.find((client) => client.url === targetUrl)
  if (exactClient) return exactClient.focus()

  const client = windowClients[0]
  if (client && typeof client.navigate === "function") {
    try {
      const navigatedClient = await client.navigate(targetUrl)
      if (navigatedClient) return navigatedClient.focus()
    } catch {
      // Fall through and open a new window.
    }
  }

  return self.clients.openWindow(targetUrl)
}

// The worker has no document, so the double-submit CSRF token can only come from
// the CookieStore API. Chromium exposes it to workers; Safari and Firefox do not,
// and there the app-side reconcile on next launch remains the only recovery path.
async function readCsrfToken() {
  if (!self.cookieStore) return null

  try {
    const cookie = await self.cookieStore.get(CSRF_COOKIE_NAME)
    return cookie && cookie.value ? cookie.value : null
  } catch {
    return null
  }
}

// Chrome fires pushsubscriptionchange without newSubscription, so the replacement
// has to be rebuilt from whatever the event or the registration still knows.
async function resolveReplacementSubscription(event) {
  if (event.newSubscription) return event.newSubscription

  const active = await self.registration.pushManager.getSubscription()
  if (active) return active

  const options = event.oldSubscription && event.oldSubscription.options
  if (!options || !options.applicationServerKey) return null

  try {
    return await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: options.applicationServerKey,
    })
  } catch {
    return null
  }
}

function toSubscriptionRequest(subscription) {
  const json = subscription.toJSON()
  const endpoint = typeof json.endpoint === "string" ? json.endpoint.trim() : ""
  const p256dh = json.keys && typeof json.keys.p256dh === "string" ? json.keys.p256dh.trim() : ""
  const auth = json.keys && typeof json.keys.auth === "string" ? json.keys.auth.trim() : ""
  if (!endpoint || !p256dh || !auth) return null

  const expirationTime =
    Number.isSafeInteger(json.expirationTime) && json.expirationTime >= 0
      ? json.expirationTime
      : null

  return { endpoint, expirationTime, keys: { p256dh, auth } }
}

async function syncSubscriptionChange(event) {
  const subscription = await resolveReplacementSubscription(event)
  if (!subscription) return

  const body = toSubscriptionRequest(subscription)
  if (!body) return

  const csrfToken = await readCsrfToken()
  if (!csrfToken) return

  try {
    await self.fetch(SUBSCRIPTION_ENDPOINT, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: csrfToken,
      },
      body: JSON.stringify(body),
    })
  } catch {
    // The app reconciles on next launch; a failed background sync must stay quiet.
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(showPushNotification(event))
})

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(syncSubscriptionChange(event))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(openNotificationDestination(event.notification.data?.url))
})
