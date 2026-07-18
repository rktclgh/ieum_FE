import assert from "node:assert/strict"
import test from "node:test"

import {
  createOrReuseWebPushSubscription,
  getExistingWebPushSubscription,
  isIosInstallRequired,
  isWebPushSupported,
  registerWebPushServiceWorker,
  resolveWebPushStatus,
  shouldStartWebPushReconcile,
  shouldUpsertReconciledSubscription,
  toWebPushSubscriptionRequest,
  urlBase64ToUint8Array,
} from "../../src/features/notification/lib/web-push"

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
const IPADOS_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
const DESKTOP_MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

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
      iosInstallRequired: false,
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
      iosInstallRequired: false,
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
      iosInstallRequired: false,
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
      iosInstallRequired: false,
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
      iosInstallRequired: false,
    }),
    "unsubscribed",
  )
})

test("tells an uninstalled iOS visitor to install instead of claiming no support", () => {
  assert.equal(
    resolveWebPushStatus({
      supported: false,
      serverEnabled: true,
      permission: "default",
      backendSubscribed: false,
      browserSubscribed: false,
      iosInstallRequired: true,
    }),
    "ios-install-required",
  )
})

test("keeps the install hint out of a supported iOS home screen app", () => {
  // A standalone iOS app exposes PushManager, so the gate must not shadow real state.
  assert.equal(
    resolveWebPushStatus({
      supported: true,
      serverEnabled: true,
      permission: "granted",
      backendSubscribed: true,
      browserSubscribed: true,
      iosInstallRequired: false,
    }),
    "subscribed",
  )
})

test("requires installation only for iOS browsers outside standalone display", () => {
  assert.equal(
    isIosInstallRequired({
      userAgent: IPHONE_UA,
      maxTouchPoints: 5,
      standalone: false,
      displayModeStandalone: false,
    }),
    true,
  )
})

test("detects iPadOS that masquerades as desktop Safari via touch points", () => {
  assert.equal(
    isIosInstallRequired({
      userAgent: IPADOS_UA,
      maxTouchPoints: 5,
      standalone: false,
      displayModeStandalone: false,
    }),
    true,
  )
})

test("never asks a real desktop Mac to install", () => {
  assert.equal(
    isIosInstallRequired({
      userAgent: DESKTOP_MAC_UA,
      maxTouchPoints: 0,
      standalone: undefined,
      displayModeStandalone: false,
    }),
    false,
  )
})

test("stops asking once iOS reports the home screen app", () => {
  assert.equal(
    isIosInstallRequired({
      userAgent: IPHONE_UA,
      maxTouchPoints: 5,
      standalone: true,
      displayModeStandalone: false,
    }),
    false,
  )
})

test("accepts the standalone display media query as installed evidence", () => {
  // Older iOS exposes navigator.standalone; the display-mode query is the modern signal.
  assert.equal(
    isIosInstallRequired({
      userAgent: IPHONE_UA,
      maxTouchPoints: 5,
      standalone: undefined,
      displayModeStandalone: true,
    }),
    false,
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
  const installingRegistration = { pushManager: {} } as ServiceWorkerRegistration
  const activeRegistration = { pushManager: {} } as ServiceWorkerRegistration
  const restoreNavigator = replaceGlobal("navigator", {
    serviceWorker: {
      ready: Promise.resolve(activeRegistration),
      register: async (...args: unknown[]) => {
        calls.push(args)
        return installingRegistration
      },
    },
  })

  try {
    assert.equal(await registerWebPushServiceWorker(), activeRegistration)
    assert.deepEqual(calls, [["/sw.js", { scope: "/" }]])
  } finally {
    restoreNavigator()
  }
})

test("rejects instead of hanging when service worker registration fails", async () => {
  const restoreNavigator = replaceGlobal("navigator", {
    serviceWorker: {
      ready: new Promise(() => {
        // Never resolves: with no active worker, `.ready` would hang forever
        // if the util below swallowed the registration failure.
      }),
      register: async () => {
        throw new Error("registration failed")
      },
    },
  })

  try {
    await assert.rejects(registerWebPushServiceWorker(), /registration failed/)
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

test("reconcile starts only for a signed-in user who opted in and granted permission", () => {
  const base = {
    userId: 7,
    notifyAll: true,
    supported: true,
    permission: "granted" as NotificationPermission,
  }

  assert.equal(shouldStartWebPushReconcile(base), true)
  assert.equal(shouldStartWebPushReconcile({ ...base, userId: undefined }), false)
  assert.equal(shouldStartWebPushReconcile({ ...base, notifyAll: false }), false)
  assert.equal(shouldStartWebPushReconcile({ ...base, notifyAll: undefined }), false)
  assert.equal(shouldStartWebPushReconcile({ ...base, supported: false }), false)
  assert.equal(shouldStartWebPushReconcile({ ...base, permission: "default" }), false)
  assert.equal(shouldStartWebPushReconcile({ ...base, permission: "denied" }), false)
})

test("reconcile re-upserts even while the backend still reports itself subscribed", () => {
  // The backend answers `subscribed` for the user+session pair, not for the
  // endpoint the browser currently holds. Trusting it would skip reconcile in
  // exactly the case reconcile exists for: a rotated endpoint left rotting.
  assert.equal(
    shouldUpsertReconciledSubscription({
      serverEnabled: true,
      hasBrowserSubscription: true,
      backendSubscribed: true,
    }),
    true,
  )
})

test("reconcile upserts when the backend reports no subscription", () => {
  assert.equal(
    shouldUpsertReconciledSubscription({
      serverEnabled: true,
      hasBrowserSubscription: true,
      backendSubscribed: false,
    }),
    true,
  )
})

test("reconcile stays idle when the server disabled push or the browser has nothing to send", () => {
  assert.equal(
    shouldUpsertReconciledSubscription({
      serverEnabled: false,
      hasBrowserSubscription: true,
      backendSubscribed: false,
    }),
    false,
  )
  assert.equal(
    shouldUpsertReconciledSubscription({
      serverEnabled: true,
      hasBrowserSubscription: false,
      backendSubscribed: false,
    }),
    false,
  )
})
