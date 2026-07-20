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

// 서버는 완성된 문장이 아니라 messageKey + messageParams + 수신자 언어(lang)를 보낸다(백엔드 이슈 #193).
// 서비스워커는 React i18n 카탈로그(src/lib/i18n/messages/*.ts)에 접근할 수 없어 알림 문구만 여기 인라인한다.
// ★ src/lib/i18n/messages/*.ts 의 notification.copy 와 항상 같은 내용을 유지할 것.
//   드리프트는 scripts/ci/test-web-push-worker.mjs 의 카탈로그 계약 테스트가 잡는다.
// 형식: [제목, 본문] — 본문의 {name} 은 messageParams 로 치환한다.
const NOTIFICATION_COPY = {
  ko: {
    "notification.answer.created": ["새 답변", "회원님의 질문에 답변이 달렸어요"],
    "notification.answer.accepted": ["답변 채택", "회원님의 답변이 채택됐어요"],
    "notification.friend.request": ["친구 요청", "{nickname}님이 친구 요청을 보냈어요"],
    "notification.radius.question": ["주변 새 질문", "{subject}"],
    "notification.radius.meeting": ["주변 새 모임", "{subject}"],
    "notification.chat.message": ["새 메시지", "새 채팅 메시지가 도착했어요"],
  },
  en: {
    "notification.answer.created": ["New answer", "Someone answered your question"],
    "notification.answer.accepted": ["Answer accepted", "Your answer was accepted"],
    "notification.friend.request": ["Friend request", "{nickname} sent you a friend request"],
    "notification.radius.question": ["New question nearby", "{subject}"],
    "notification.radius.meeting": ["New meetup nearby", "{subject}"],
    "notification.chat.message": ["New message", "You have a new chat message"],
  },
  ja: {
    "notification.answer.created": ["新しい回答", "あなたの質問に回答が届きました"],
    "notification.answer.accepted": ["回答が採用されました", "あなたの回答が採用されました"],
    "notification.friend.request": ["友だち申請", "{nickname}さんから友だち申請が届きました"],
    "notification.radius.question": ["近くの新しい質問", "{subject}"],
    "notification.radius.meeting": ["近くの新しい集まり", "{subject}"],
    "notification.chat.message": ["新しいメッセージ", "新しいチャットメッセージが届きました"],
  },
  zh: {
    "notification.answer.created": ["新回答", "有人回答了你的提问"],
    "notification.answer.accepted": ["回答被采纳", "你的回答被采纳了"],
    "notification.friend.request": ["好友申请", "{nickname} 向你发送了好友申请"],
    "notification.radius.question": ["附近的新提问", "{subject}"],
    "notification.radius.meeting": ["附近的新聚会", "{subject}"],
    "notification.chat.message": ["新消息", "你有一条新的聊天消息"],
  },
  vi: {
    "notification.answer.created": ["Câu trả lời mới", "Có người đã trả lời câu hỏi của bạn"],
    "notification.answer.accepted": ["Câu trả lời được chọn", "Câu trả lời của bạn đã được chọn"],
    "notification.friend.request": ["Lời mời kết bạn", "{nickname} đã gửi lời mời kết bạn"],
    "notification.radius.question": ["Câu hỏi mới gần bạn", "{subject}"],
    "notification.radius.meeting": ["Buổi gặp mới gần bạn", "{subject}"],
    "notification.chat.message": ["Tin nhắn mới", "Bạn có tin nhắn trò chuyện mới"],
  },
  th: {
    "notification.answer.created": ["คำตอบใหม่", "มีคนตอบคำถามของคุณแล้ว"],
    "notification.answer.accepted": ["คำตอบได้รับเลือก", "คำตอบของคุณได้รับเลือกแล้ว"],
    "notification.friend.request": ["คำขอเป็นเพื่อน", "{nickname} ส่งคำขอเป็นเพื่อนถึงคุณ"],
    "notification.radius.question": ["คำถามใหม่ใกล้คุณ", "{subject}"],
    "notification.radius.meeting": ["นัดพบใหม่ใกล้คุณ", "{subject}"],
    "notification.chat.message": ["ข้อความใหม่", "คุณมีข้อความแชทใหม่"],
  },
  ru: {
    "notification.answer.created": ["Новый ответ", "На ваш вопрос ответили"],
    "notification.answer.accepted": ["Ответ принят", "Ваш ответ был принят"],
    "notification.friend.request": ["Заявка в друзья", "{nickname} отправил(а) вам заявку в друзья"],
    "notification.radius.question": ["Новый вопрос рядом", "{subject}"],
    "notification.radius.meeting": ["Новая встреча рядом", "{subject}"],
    "notification.chat.message": ["Новое сообщение", "У вас новое сообщение в чате"],
  },
}

const FALLBACK_LANGUAGE = "ko"

function substituteParams(template, params) {
  if (!params || typeof params !== "object") return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    typeof params[name] === "string" ? params[name] : match
  )
}

function hasRequiredTemplateParams(template, params) {
  return [...template.matchAll(/\{(\w+)\}/g)].every(([, name]) => {
    const value = params?.[name]
    return typeof value === "string" && value.trim() !== ""
  })
}

// 키를 수신자 언어로 렌더한다. 키가 없거나(구 서버) 카탈로그에 없으면 null 을 돌려
// 호출부가 서버가 실어보낸 title/body(ko 폴백)를 쓰게 한다.
function copyFromMessageKey(payload) {
  if (typeof payload.messageKey !== "string") return null

  const table = NOTIFICATION_COPY[payload.lang] ?? NOTIFICATION_COPY[FALLBACK_LANGUAGE]
  const entry = table?.[payload.messageKey]
  if (!entry) return null
  if (
    !hasRequiredTemplateParams(entry[0], payload.messageParams) ||
    !hasRequiredTemplateParams(entry[1], payload.messageParams)
  ) {
    return null
  }

  return {
    title: substituteParams(entry[0], payload.messageParams),
    body: substituteParams(entry[1], payload.messageParams),
  }
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

  // messageKey 가 있으면 수신자 언어로 렌더하고, 없거나 카탈로그에 빠진 키면
  // 서버가 함께 실어보낸 title/body(ko 폴백)를 쓴다.
  const copy = copyFromMessageKey(payload)

  if (payload.kind === "chat") {
    return {
      title: nonEmptyString(copy?.title ?? payload.title, FALLBACK_TITLE),
      body: nonEmptyString(copy?.body ?? payload.body, FALLBACK_BODY),
      tag: nonEmptyString(payload.tag, FALLBACK_TAG),
      url: safeDestination(payload.url),
    }
  }

  if (payload.kind === "notification") {
    const title = nonEmptyString(copy?.title ?? payload.title, FALLBACK_TITLE)
    const notificationId = Number.isSafeInteger(payload.notificationId) && payload.notificationId > 0
      ? payload.notificationId
      : null
    // type/refId 로 딥링크를 계산하고, 매핑 불가하면 알림센터로 폴백한다.
    const destination = resolveNotificationDestination(payload.type, payload.refId)
    return {
      title: payload.answerIsAi === true ? `AI · ${title}` : title,
      body: nonEmptyString(copy?.body ?? payload.body, FALLBACK_BODY),
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

// Chrome 설치 가능(installability) 판정은 fetch 핸들러 존재를 요구한다.
// 요청을 가로채지 않고 네트워크로 통과시키는 no-op(오프라인 캐싱 없음).
self.addEventListener("fetch", () => {})

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

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
