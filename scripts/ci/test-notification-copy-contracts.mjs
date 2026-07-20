import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

// 알림 문구 카탈로그는 두 벌 존재한다 — React 앱용(src/lib/i18n/messages/*.ts)과
// 서비스워커용(public/sw.js). 서비스워커는 React i18n 에 접근할 수 없어 인라인이 불가피하다.
// 두 벌이 조용히 어긋나면 "앱에서는 영어인데 푸시 배너만 한국어" 같은 상태가 되므로,
// 키 집합과 언어 집합이 정확히 같은지 여기서 잠근다.

function readSource(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

/** notification-message-keys.ts 의 키 목록 — 백엔드 NotificationMessageKey.java 와 1:1인 SSOT. */
function sourceOfTruthKeys() {
  const source = readSource("src/lib/i18n/notification-message-keys.ts")
  const block = source.match(/NOTIFICATION_MESSAGE_KEYS = \[([\s\S]*?)\]/)
  assert.ok(block, "NOTIFICATION_MESSAGE_KEYS 배열을 찾지 못했다")
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
}

/** languages.ts 의 지원 언어. */
function supportedLanguages() {
  const source = readSource("src/lib/i18n/languages.ts")
  const block = source.match(/LANGUAGE_CODES = \[([\s\S]*?)\]/)
  assert.ok(block, "LANGUAGE_CODES 배열을 찾지 못했다")
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
}

/** sw.js 의 NOTIFICATION_COPY 에서 언어별 키 목록을 뽑는다. */
function serviceWorkerCatalog() {
  const source = readSource("public/sw.js")
  const start = source.indexOf("const NOTIFICATION_COPY = {")
  assert.ok(start >= 0, "sw.js 에서 NOTIFICATION_COPY 를 찾지 못했다")
  const end = source.indexOf("\n}\n", start)
  const block = source.slice(start, end)

  const catalog = {}
  let current = null
  for (const line of block.split("\n")) {
    const language = line.match(/^ {2}(\w+): \{$/)
    if (language) {
      current = language[1]
      catalog[current] = []
      continue
    }
    const key = line.match(/^ {4}"([^"]+)":/)
    if (key && current) catalog[current].push(key[1])
  }
  return catalog
}

test("서비스워커 카탈로그가 지원 언어 7종을 모두 갖는다", () => {
  const catalog = serviceWorkerCatalog()
  assert.deepEqual(Object.keys(catalog).sort(), supportedLanguages().sort())
})

test("서비스워커 카탈로그의 각 언어가 SSOT 키 전부를 갖는다", () => {
  const expected = sourceOfTruthKeys().sort()
  assert.ok(expected.length > 0, "SSOT 키가 비어 있다")

  for (const [language, keys] of Object.entries(serviceWorkerCatalog())) {
    assert.deepEqual(
      keys.sort(),
      expected,
      `sw.js 의 ${language} 카탈로그가 SSOT 키와 다르다 — 앱과 푸시 배너 문구가 어긋난다`
    )
  }
})

test("React 카탈로그의 각 언어도 SSOT 키 전부를 갖는다", () => {
  const expected = sourceOfTruthKeys()

  for (const language of supportedLanguages()) {
    const source = readSource(`src/lib/i18n/messages/${language}.ts`)
    for (const key of expected) {
      assert.ok(
        source.includes(`"${key}"`),
        `${language}.ts 에 ${key} 문구가 없다`
      )
    }
  }
})

test("파라미터를 쓰는 키는 두 카탈로그 모두에서 플레이스홀더를 갖는다", () => {
  // 값이 비면 "님이 친구 요청을 보냈어요" 처럼 주어 없는 문장이 나가므로 치환 자리를 강제한다.
  const parameterised = {
    "notification.friend.request": "nickname",
    "notification.radius.question": "subject",
    "notification.radius.meeting": "subject",
  }

  const worker = readSource("public/sw.js")
  for (const [key, param] of Object.entries(parameterised)) {
    const lines = worker.split("\n").filter((line) => line.includes(`"${key}":`))
    assert.ok(lines.length > 0, `sw.js 에 ${key} 가 없다`)
    for (const line of lines) {
      assert.ok(line.includes(`{${param}}`), `sw.js 의 ${key} 에 {${param}} 이 없다: ${line.trim()}`)
    }
  }

  for (const language of supportedLanguages()) {
    const source = readSource(`src/lib/i18n/messages/${language}.ts`)
    for (const [key, param] of Object.entries(parameterised)) {
      const index = source.indexOf(`"${key}"`)
      assert.ok(index >= 0, `${language}.ts 에 ${key} 가 없다`)
      const entry = source.slice(index, index + 400)
      assert.ok(
        entry.includes(`params.${param}`),
        `${language}.ts 의 ${key} 가 params.${param} 을 안 쓴다`
      )
    }
  }
})
