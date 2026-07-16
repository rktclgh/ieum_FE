import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import vm from "node:vm"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function loadWorker(windowClients = []) {
  const listeners = new Map()
  const shown = []
  const opened = []
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
    },
  }

  vm.runInNewContext(
    fs.readFileSync(path.join(repoRoot, "public/sw.js"), "utf8"),
    { self, URL },
    { filename: "public/sw.js" },
  )

  return { listeners, opened, shown }
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

test("registers only push and notification click listeners", () => {
  const worker = loadWorker()
  assert.deepEqual([...worker.listeners.keys()].sort(), ["notificationclick", "push"])
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

test("marks an AI durable notification and always opens the notification center", async () => {
  const worker = loadWorker()
  await dispatchPush(worker, {
    version: 1,
    kind: "notification",
    notificationId: 42,
    title: "새 답변",
    body: "답변이 등록됐어요",
    refId: 9,
    answerIsAi: true,
  })

  assert.equal(worker.shown[0].title, "AI · 새 답변")
  assert.equal(worker.shown[0].options.tag, "notification-42")
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
