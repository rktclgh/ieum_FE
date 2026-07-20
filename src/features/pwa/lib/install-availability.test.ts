import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { resolveInstallMethod } from "./install-availability.ts"

const base = { isStandalone: false, isIOSSafari: false, hasDeferredPrompt: false, isDismissed: false }

test("이미 설치(standalone)면 dismissal·prompt와 무관하게 unavailable", () => {
  assert.equal(
    resolveInstallMethod({ ...base, isStandalone: true, hasDeferredPrompt: true }),
    "unavailable"
  )
})

test("1회 소진(dismissed)이면 unavailable", () => {
  assert.equal(
    resolveInstallMethod({ ...base, isDismissed: true, hasDeferredPrompt: true }),
    "unavailable"
  )
})

test("deferredPrompt 있으면 prompt", () => {
  assert.equal(resolveInstallMethod({ ...base, hasDeferredPrompt: true }), "prompt")
})

test("prompt 없고 iOS Safari면 ios-manual", () => {
  assert.equal(resolveInstallMethod({ ...base, isIOSSafari: true }), "ios-manual")
})

test("그 외에는 unavailable", () => {
  assert.equal(resolveInstallMethod(base), "unavailable")
})

test("standalone은 iOS Safari보다 우선", () => {
  assert.equal(
    resolveInstallMethod({ ...base, isStandalone: true, isIOSSafari: true }),
    "unavailable"
  )
})
