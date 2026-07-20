import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import vm from "node:vm"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function loadWorker(windowClients = [], options = {}) {
  const {
    csrfToken = "csrf-value",
    cookieStoreAvailable = true,
    existingSubscription = null,
    resubscribeResult = null,
    transformWorkerSource = (source) => source,
  } = options

  const listeners = new Map()
  const shown = []
  const opened = []
  const requests = []
  const subscribeOptions = []

  const self = {
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    clients: {
      matchAll: async () => windowClients,
      openWindow: async (url) => {
        opened.push(url)
        return null
      },
    },
    location: { origin: "https://ieum.example" },
    registration: {
      showNotification: async (title, options) => {
        shown.push({ title, options })
      },
      pushManager: {
        getSubscription: async () => existingSubscription,
        subscribe: async (subscribeInit) => {
          subscribeOptions.push(subscribeInit)
          return resubscribeResult
        },
      },
    },
    fetch: async (url, init) => {
      requests.push({ url, init })
      return { ok: true, status: 204 }
    },
  }

  if (cookieStoreAvailable) {
    self.cookieStore = {
      get: async (name) =>
        name === "csrf_token" && csrfToken ? { name, value: csrfToken } : null,
    }
  }

  const source = transformWorkerSource(
    fs.readFileSync(path.join(repoRoot, "public/sw.js"), "utf8"),
  )

  vm.runInNewContext(
    source,
    { self, URL },
    { filename: "public/sw.js" },
  )

  return { listeners, opened, shown, requests, subscribeOptions }
}

async function dispatchSubscriptionChange(worker, event = {}) {
  let completion
  worker.listeners.get("pushsubscriptionchange")({
    ...event,
    waitUntil(promise) {
      completion = promise
    },
  })
  await completion
}

function fakeSubscription(endpoint) {
  return {
    toJSON: () => ({
      endpoint,
      expirationTime: null,
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    }),
  }
}

async function dispatchPush(worker, payload, parseFailure = false) {
  let completion
  worker.listeners.get("push")({
    data: {
      json() {
        if (parseFailure) throw new SyntaxError("invalid push data")
        return payload
      },
    },
    waitUntil(promise) {
      completion = promise
    },
  })
  await completion
}

test("registers push, notification click, and subscription change listeners", () => {
  const worker = loadWorker()
  assert.deepEqual(
    [...worker.listeners.keys()].sort(),
    ["fetch", "notificationclick", "push", "pushsubscriptionchange"],
  )
})

test("syncs the browser-supplied replacement subscription to the backend", async () => {
  const worker = loadWorker()
  await dispatchSubscriptionChange(worker, {
    newSubscription: fakeSubscription("https://fcm.googleapis.com/push/new"),
  })

  assert.equal(worker.requests.length, 1)
  const [request] = worker.requests
  assert.equal(request.url, "/api/v1/notifications/push/subscription")
  assert.equal(request.init.method, "PUT")
  assert.equal(request.init.credentials, "include")
  assert.equal(request.init.headers["X-CSRF-Token"], "csrf-value")
  assert.deepEqual(JSON.parse(request.init.body), {
    endpoint: "https://fcm.googleapis.com/push/new",
    expirationTime: null,
    keys: { p256dh: "p256dh-value", auth: "auth-value" },
  })
})

test("resubscribes with the old application server key when newSubscription is absent", async () => {
  // Chrome fires the event without newSubscription; the key must come from oldSubscription.
  const applicationServerKey = new Uint8Array([1, 2, 3, 4])
  const worker = loadWorker([], {
    resubscribeResult: fakeSubscription("https://fcm.googleapis.com/push/rotated"),
  })

  await dispatchSubscriptionChange(worker, {
    oldSubscription: { options: { userVisibleOnly: true, applicationServerKey } },
  })

  // The worker builds this object inside the vm realm, so compare fields rather
  // than the object identity that a deep-equal would demand.
  assert.equal(worker.subscribeOptions.length, 1)
  assert.equal(worker.subscribeOptions[0].userVisibleOnly, true)
  assert.equal(worker.subscribeOptions[0].applicationServerKey, applicationServerKey)
  assert.equal(worker.requests.length, 1)
  assert.equal(
    JSON.parse(worker.requests[0].init.body).endpoint,
    "https://fcm.googleapis.com/push/rotated",
  )
})

test("reuses an already-active subscription instead of forcing a new one", async () => {
  const worker = loadWorker([], {
    existingSubscription: fakeSubscription("https://fcm.googleapis.com/push/active"),
  })

  await dispatchSubscriptionChange(worker, {})

  assert.deepEqual(worker.subscribeOptions, [])
  assert.equal(
    JSON.parse(worker.requests[0].init.body).endpoint,
    "https://fcm.googleapis.com/push/active",
  )
})

test("stays silent when no CSRF token is reachable from the worker", async () => {
  // Safari and Firefox expose no CookieStore in workers; the app reconciles instead.
  const worker = loadWorker([], {
    cookieStoreAvailable: false,
    existingSubscription: fakeSubscription("https://fcm.googleapis.com/push/active"),
  })

  await dispatchSubscriptionChange(worker, {})

  assert.deepEqual(worker.requests, [])
})

test("stays silent when the subscription cannot be recovered", async () => {
  const worker = loadWorker()

  await dispatchSubscriptionChange(worker, {})

  assert.deepEqual(worker.requests, [])
})

test("never sends a subscription that lost its encryption keys", async () => {
  const worker = loadWorker([], {
    existingSubscription: {
      toJSON: () => ({ endpoint: "https://fcm.googleapis.com/push/broken", keys: {} }),
    },
  })

  await dispatchSubscriptionChange(worker, {})

  assert.deepEqual(worker.requests, [])
})

test("shows a privacy-safe fallback when payload parsing fails", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, null, true)

  assert.equal(worker.shown.length, 1)
  assert.equal(worker.shown[0].title, "새 알림")
  assert.equal(worker.shown[0].options.tag, "notification-fallback")
  assert.equal(worker.shown[0].options.data.url, "/notifications/")
})

test("accepts a relative chat destination but rejects a protocol-relative host", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "chat",
    title: "새 메시지",
    body: "새 채팅 메시지가 도착했어요",
    url: "/chats/room/?chatId=7",
    tag: "chat-room-7",
  })
  await dispatchPush(worker, {
    version: 1,
    kind: "chat",
    title: "새 메시지",
    body: "새 채팅 메시지가 도착했어요",
    url: "//evil.example/steal",
    tag: "chat-room-8",
  })

  assert.equal(worker.shown[0].options.data.url, "/chats/room/?chatId=7")
  assert.equal(worker.shown[0].options.tag, "chat-room-7")
  assert.equal(worker.shown[1].options.data.url, "/notifications/")
})

test("rejects a chat destination that normalizes to protocol-relative", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "chat",
    title: "새 메시지",
    body: "새 채팅 메시지가 도착했어요",
    url: "/.//evil.example/steal",
    tag: "chat-room-9",
  })

  assert.equal(worker.shown[0].options.data.url, "/notifications/")
})

test("marks an AI durable answer notification and deep-links to the question", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 42,
    type: "question",
    title: "새 답변",
    body: "답변이 등록됐어요",
    refId: 9,
    answerIsAi: true,
  })

  assert.equal(worker.shown[0].title, "AI · 새 답변")
  assert.equal(worker.shown[0].options.tag, "notification-42")
  assert.equal(worker.shown[0].options.data.url, "/questions/detail/?questionId=9")
})

test("deep-links a friend-request durable notification to the friends page", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 43,
    type: "friend",
    title: "친구 요청",
    body: "민지님이 친구 요청을 보냈어요",
    refId: 77,
    answerIsAi: null,
  })

  assert.equal(worker.shown[0].options.data.url, "/friends/?highlightUserId=77")
})

test("substitutes parameters in a localized notification title", async () => {
  const worker = loadWorker([], {
    transformWorkerSource(source) {
      const original = '"notification.answer.created": ["새 답변", "회원님의 질문에 답변이 달렸어요"],'
      const replacement = '"notification.answer.created": ["{nickname}님의 새 답변", "회원님의 질문에 답변이 달렸어요"],'
      assert.ok(source.includes(original), "테스트용 제목 템플릿 치환 대상이 없다")
      return source.replace(original, replacement)
    },
  })

  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 50,
    type: "question",
    title: "서버 제목",
    body: "서버 본문",
    messageKey: "notification.answer.created",
    messageParams: { nickname: "민지" },
    refId: 9,
    answerIsAi: false,
  })

  assert.equal(worker.shown[0].title, "민지님의 새 답변")
})

test("uses the server fallback when a friend request has no nickname", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 48,
    type: "friend",
    title: "친구 요청",
    body: "누군가 친구 요청을 보냈어요",
    messageKey: "notification.friend.request",
    messageParams: {},
    refId: 77,
    answerIsAi: null,
  })

  assert.equal(worker.shown[0].title, "친구 요청")
  assert.equal(worker.shown[0].options.body, "누군가 친구 요청을 보냈어요")
})

test("uses the server fallback when a nearby question has no subject", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 49,
    type: "question",
    title: "주변 새 질문",
    body: "오늘 저녁 뭐 먹을까요?",
    messageKey: "notification.radius.question",
    messageParams: {},
    refId: 9,
    answerIsAi: null,
  })

  assert.equal(worker.shown[0].title, "주변 새 질문")
  assert.equal(worker.shown[0].options.body, "오늘 저녁 뭐 먹을까요?")
})

test("opens the friends page without a highlight when a friend notification lacks a refId", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 47,
    type: "friend",
    title: "친구 요청",
    body: "누군가 친구 요청을 보냈어요",
    refId: null,
    answerIsAi: null,
  })

  assert.equal(worker.shown[0].options.data.url, "/friends/")
})

test("deep-links a meeting durable notification to the meetup detail", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 44,
    type: "meeting",
    title: "주변 새 모임",
    body: "가까운 곳에 새 모임이 열렸어요",
    refId: 5,
    answerIsAi: null,
  })

  assert.equal(worker.shown[0].options.data.url, "/meetups/detail/?meetingId=5")
})

test("falls back to the notification center when the durable type is unmappable", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 45,
    type: "system",
    title: "공지",
    body: "새로운 공지가 있어요",
    refId: null,
    answerIsAi: null,
  })

  assert.equal(worker.shown[0].options.data.url, "/notifications/")
})

test("falls back to the notification center when a deep-linkable type lacks a valid refId", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 46,
    type: "question",
    title: "새 답변",
    body: "답변이 등록됐어요",
    refId: 0,
    answerIsAi: false,
  })

  assert.equal(worker.shown[0].options.data.url, "/notifications/")
})

test("notification click closes and opens a validated same-origin destination", async () => {
  const worker = loadWorker()
  let closed = false
  let completion

  worker.listeners.get("notificationclick")({
    notification: {
      close() {
        closed = true
      },
      data: { url: "https://evil.example/steal" },
    },
    waitUntil(promise) {
      completion = promise
    },
  })
  await completion

  assert.equal(closed, true)
  assert.deepEqual(worker.opened, ["https://ieum.example/notifications/"])
})

test("notification click rejects a normalized protocol-relative destination", async () => {
  const worker = loadWorker()
  let completion

  worker.listeners.get("notificationclick")({
    notification: {
      close() {},
      data: { url: "/.//evil.example/steal" },
    },
    waitUntil(promise) {
      completion = promise
    },
  })
  await completion

  assert.deepEqual(worker.opened, ["https://ieum.example/notifications/"])
})

test("notification click navigates and focuses an existing app window", async () => {
  const navigated = []
  let focused = 0
  const client = {
    url: "https://ieum.example/",
    async navigate(url) {
      navigated.push(url)
      client.url = url
      return client
    },
    async focus() {
      focused += 1
      return client
    },
  }
  const worker = loadWorker([client])
  let completion

  worker.listeners.get("notificationclick")({
    notification: {
      close() {},
      data: { url: "/chats/room/?chatId=7" },
    },
    waitUntil(promise) {
      completion = promise
    },
  })
  await completion

  assert.deepEqual(navigated, ["https://ieum.example/chats/room/?chatId=7"])
  assert.equal(focused, 1)
  assert.deepEqual(worker.opened, [])
})

test("notification click opens a new window when existing-client navigation rejects", async () => {
  let completion
  const client = {
    url: "https://ieum.example/",
    async navigate() {
      throw new Error("navigation failed")
    },
    async focus() {
      throw new Error("stale client must not be focused")
    },
  }
  const worker = loadWorker([client])

  worker.listeners.get("notificationclick")({
    notification: {
      close() {},
      data: { url: "/chats/room/?chatId=7" },
    },
    waitUntil(promise) {
      completion = promise
    },
  })
  await completion

  assert.deepEqual(worker.opened, ["https://ieum.example/chats/room/?chatId=7"])
})

test("notification click opens a new window when existing-client navigation returns null", async () => {
  let completion
  let focused = 0
  const client = {
    url: "https://ieum.example/",
    async navigate() {
      return null
    },
    async focus() {
      focused += 1
      return client
    },
  }
  const worker = loadWorker([client])

  worker.listeners.get("notificationclick")({
    notification: {
      close() {},
      data: { url: "/chats/room/?chatId=7" },
    },
    waitUntil(promise) {
      completion = promise
    },
  })
  await completion

  assert.equal(focused, 0)
  assert.deepEqual(worker.opened, ["https://ieum.example/chats/room/?chatId=7"])
})
