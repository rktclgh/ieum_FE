import assert from "node:assert/strict"
import test from "node:test"

import {
  createOrReuseWebPushSubscription,
  getExistingWebPushSubscription,
  isWebPushSupported,
  registerWebPushServiceWorker,
  resolveWebPushStatus,
  toWebPushSubscriptionRequest,
  urlBase64ToUint8Array,
} from "../../src/features/notification/lib/web-push"

function replaceGlobal(name: "window" | "navigator", value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { configurable: true, value })
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous)
    else Reflect.deleteProperty(globalThis, name)
  }
}

test("decodes a URL-safe VAPID public key", () => {
  assert.deepEqual([...urlBase64ToUint8Array("AQIDBA")], [1, 2, 3, 4])
})

test("maps a complete browser subscription to the backend request", () => {
  assert.deepEqual(
    toWebPushSubscriptionRequest({
      endpoint: "https://fcm.googleapis.com/push/123",
      expirationTime: null,
      keys: {
        p256dh: "p256dh-value",
        auth: "auth-value",
      },
    }),
    {
      endpoint: "https://fcm.googleapis.com/push/123",
      expirationTime: null,
      keys: {
        p256dh: "p256dh-value",
        auth: "auth-value",
      },
    },
  )
})

test("rejects a browser subscription without encryption keys", () => {
  assert.throws(
    () =>
      toWebPushSubscriptionRequest({
        endpoint: "https://fcm.googleapis.com/push/123",
        expirationTime: null,
      }),
    /encryption keys/i,
  )
})

test("selects a stable status from browser and backend state", () => {
  assert.equal(
    resolveWebPushStatus({
      supported: false,
      serverEnabled: true,
      permission: "granted",
      backendSubscribed: true,
      browserSubscribed: true,
    }),
    "unsupported",
  )
  assert.equal(
    resolveWebPushStatus({
      supported: true,
      serverEnabled: false,
      permission: "granted",
      backendSubscribed: true,
      browserSubscribed: true,
    }),
    "server-disabled",
  )
  assert.equal(
    resolveWebPushStatus({
      supported: true,
      serverEnabled: true,
      permission: "denied",
      backendSubscribed: true,
      browserSubscribed: true,
    }),
    "permission-denied",
  )
  assert.equal(
    resolveWebPushStatus({
      supported: true,
      serverEnabled: true,
      permission: "granted",
      backendSubscribed: true,
      browserSubscribed: true,
    }),
    "subscribed",
  )
  assert.equal(
    resolveWebPushStatus({
      supported: true,
      serverEnabled: true,
      permission: "default",
      backendSubscribed: false,
      browserSubscribed: false,
    }),
    "unsubscribed",
  )
})

test("detects Web Push only when every required browser primitive exists", () => {
  const restoreWindow = replaceGlobal("window", {
    Notification: {},
    PushManager: class {},
  })
  const restoreNavigator = replaceGlobal("navigator", { serviceWorker: {} })

  try {
    assert.equal(isWebPushSupported(), true)
  } finally {
    restoreNavigator()
    restoreWindow()
  }
})

test("registers the root service worker with root scope", async () => {
  const calls: unknown[][] = []
  const registration = { pushManager: {} } as ServiceWorkerRegistration
  const restoreNavigator = replaceGlobal("navigator", {
    serviceWorker: {
      register: async (...args: unknown[]) => {
        calls.push(args)
        return registration
      },
    },
  })

  try {
    assert.equal(await registerWebPushServiceWorker(), registration)
    assert.deepEqual(calls, [["/sw.js", { scope: "/" }]])
  } finally {
    restoreNavigator()
  }
})

test("reads the existing subscription from a registration", async () => {
  const subscription = { endpoint: "https://push.example/subscription" } as PushSubscription
  const registration = {
    pushManager: {
      getSubscription: async () => subscription,
    },
  } as ServiceWorkerRegistration

  assert.equal(await getExistingWebPushSubscription(registration), subscription)
})

test("reuses an existing subscription without creating another", async () => {
  const subscription = { endpoint: "https://push.example/subscription" } as PushSubscription
  let subscribeCalls = 0
  const registration = {
    pushManager: {
      getSubscription: async () => subscription,
      subscribe: async () => {
        subscribeCalls += 1
        return subscription
      },
    },
  } as ServiceWorkerRegistration

  assert.equal(
    await createOrReuseWebPushSubscription(registration, "AQIDBA"),
    subscription,
  )
  assert.equal(subscribeCalls, 0)
})

test("creates a subscription with the decoded VAPID key when none exists", async () => {
  const subscription = { endpoint: "https://push.example/subscription" } as PushSubscription
  const subscribeOptions: PushSubscriptionOptionsInit[] = []
  const registration = {
    pushManager: {
      getSubscription: async () => null,
      subscribe: async (options: PushSubscriptionOptionsInit) => {
        subscribeOptions.push(options)
        return subscription
      },
    },
  } as ServiceWorkerRegistration

  assert.equal(
    await createOrReuseWebPushSubscription(registration, "AQIDBA"),
    subscription,
  )
  assert.equal(subscribeOptions.length, 1)
  assert.equal(subscribeOptions[0].userVisibleOnly, true)
  assert.deepEqual(
    [...(subscribeOptions[0].applicationServerKey as Uint8Array)],
    [1, 2, 3, 4],
  )
})
