import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { isInAppBrowserUserAgent, isIOSUserAgent } from "./platform.ts"

const IOS_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
const IOS_KAKAOTALK_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.5"
const IOS_INSTAGRAM_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.114"
const IPADOS_MASQUERADE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
const ANDROID_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"

test("실제 iOS Safari UA는 iOS이고, 인앱 브라우저는 아니다", () => {
  assert.equal(isIOSUserAgent(IOS_SAFARI_UA, true), true)
  assert.equal(isInAppBrowserUserAgent(IOS_SAFARI_UA), false)
})

test("iOS 카카오톡 인앱 웹뷰는 인앱 브라우저로 판별된다", () => {
  assert.equal(isIOSUserAgent(IOS_KAKAOTALK_UA, true), true)
  assert.equal(isInAppBrowserUserAgent(IOS_KAKAOTALK_UA), true)
})

test("iOS 인스타그램 인앱 웹뷰는 인앱 브라우저로 판별된다", () => {
  assert.equal(isIOSUserAgent(IOS_INSTAGRAM_UA, true), true)
  assert.equal(isInAppBrowserUserAgent(IOS_INSTAGRAM_UA), true)
})

test("iPadOS가 Mac으로 위장해도 터치 지원이면 iOS로 판별된다", () => {
  assert.equal(isIOSUserAgent(IPADOS_MASQUERADE_UA, true), true)
})

test("터치 미지원 데스크톱 Mac은 iOS가 아니다", () => {
  assert.equal(isIOSUserAgent(IPADOS_MASQUERADE_UA, false), false)
})

test("안드로이드 Chrome은 iOS가 아니다", () => {
  assert.equal(isIOSUserAgent(ANDROID_CHROME_UA, false), false)
})
