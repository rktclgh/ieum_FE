const NOTIFICATION_CENTER = "/notifications/"
const FALLBACK_TITLE = "새 알림"
const FALLBACK_BODY = "새 알림이 도착했어요"
const FALLBACK_TAG = "notification-fallback"

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
    return {
      title: payload.answerIsAi === true ? `AI · ${title}` : title,
      body: nonEmptyString(payload.body, FALLBACK_BODY),
      tag: notificationId === null ? FALLBACK_TAG : `notification-${notificationId}`,
      url: NOTIFICATION_CENTER,
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
    const navigatedClient = await client.navigate(targetUrl)
    return (navigatedClient || client).focus()
  }

  return self.clients.openWindow(targetUrl)
}

self.addEventListener("push", (event) => {
  event.waitUntil(showPushNotification(event))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(openNotificationDestination(event.notification.data?.url))
})
