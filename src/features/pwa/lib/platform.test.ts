import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { detectIosInstallFlow, isInAppBrowserUserAgent, isIOSUserAgent } from "./platform.ts"

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
const IOS_26_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1"
const IPADOS_18_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

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

test("iOS 26 이상은 더보기 메뉴를 거치는 modern 흐름이다", () => {
  assert.equal(detectIosInstallFlow(IOS_26_SAFARI_UA), "modern")
})

test("iOS 26 미만은 하단 공유 버튼을 쓰는 legacy 흐름이다", () => {
  assert.equal(detectIosInstallFlow(IOS_SAFARI_UA), "legacy")
})

test("iPad의 'CPU OS' 형태 UA에서도 버전을 읽는다", () => {
  assert.equal(detectIosInstallFlow(IPADOS_18_UA), "legacy")
})

test("iPadOS 데스크톱 모드 UA는 버전을 알 수 없어 unknown 흐름이다", () => {
  // Macintosh로 위장한 UA에는 iOS 버전이 실리지 않는다.
  assert.equal(detectIosInstallFlow(IPADOS_MASQUERADE_UA), "unknown")
})

test("iOS가 아닌 UA는 unknown 흐름이다", () => {
  assert.equal(detectIosInstallFlow(ANDROID_CHROME_UA), "unknown")
})
