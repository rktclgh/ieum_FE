import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function compact(source) {
  return source.replace(/\s+/g, "")
}

test("translation API client sends only visible text and target language to the generic endpoint", () => {
  const api = read("src/features/translate/api/translate-api.ts")
  const types = read("src/features/translate/api/translate-types.ts")

  assert.match(api, /function translateText\(\s*body:\s*TranslateRequest\s*\)/)
  assert.match(api, /\/api\/v1\/translate/)
  assert.doesNotMatch(api, /\/api\/v1\/answers\/\$\{answerId\}\/translation/)
  assert.doesNotMatch(api, /\/api\/v1\/chat\/messages\/\$\{messageId\}\/translation/)
  assert.doesNotMatch(api, /\bcontentId\b/)
  assert.doesNotMatch(api, /\bsourceLang\b/)

  assert.match(types, /import type \{ LanguageCode \}/)
  assert.match(types, /text:\s*string/)
  assert.match(types, /targetLang:\s*LanguageCode/)
  assert.match(types, /translatedText:\s*string/)
  assert.doesNotMatch(types, /sourceLang:\s*string/)
  assert.doesNotMatch(types, /\bcontentId\b/)
})

test("translation hook swaps only display text and exposes auth-gatable action state", () => {
  const hook = read("src/features/translate/hooks/use-translate-toggle.ts")
  const compactHook = compact(hook)

  assert.match(hook, /text:\s*string/)
  assert.match(hook, /isAuthenticated\?:\s*boolean/)
  assert.match(hook, /displayText:\s*string/)
  assert.match(hook, /canTranslate:\s*boolean/)
  assert.match(compactHook, /targetLang:language/)
  assert.match(compactHook, /text:originalText/)
  assert.match(hook, /translateText\(/)
  assert.doesNotMatch(hook, /TranslateResource/)
  assert.doesNotMatch(hook, /\bresource\b/)
  assert.doesNotMatch(hook, /\bsourceLang\b/)
  assert.doesNotMatch(hook, /\btoDeepLTargetLang\b/)
  assert.doesNotMatch(hook, /\bprovider\b/i)
})

test("chat and question DTO/adapters do not expose frontend source language fields", () => {
  const files = [
    "src/features/chat/api/chat-types.ts",
    "src/features/chat/lib/chat-adapter.ts",
    "src/features/question/api/question-types.ts",
    "src/features/question/lib/question-adapter.ts",
  ]

  for (const file of files) {
    assert.doesNotMatch(read(file), /\bsourceLang\b/, `${file} must not expose sourceLang`)
  }
})

test("translation controls are gated only by nonblank text and existing pending/report safeguards", () => {
  const questionItem = read("src/features/question/components/question-answer-item.tsx")
  const questionAuthorItem = read("src/features/question/components/question-answer-author-item.tsx")
  const chatRoom = read("src/features/chat/components/chat-room-page-content.tsx")

  assert.doesNotMatch(questionItem, /shouldShowTranslateButton|sourceLang|language/)
  assert.match(questionItem, /useTranslateToggle\(\{\s*text:\s*answer\.content,\s*isAuthenticated,/)
  assert.match(questionItem, /translate\.canTranslate/)
  assert.match(questionItem, /translate\.displayText/)

  assert.doesNotMatch(questionAuthorItem, /shouldShowTranslateButton|sourceLang|language/)
  assert.match(questionAuthorItem, /useTranslateToggle\(\{\s*text:\s*answer\.content,\s*isAuthenticated,/)
  assert.match(questionAuthorItem, /translate\.canTranslate/)
  assert.match(questionAuthorItem, /translate\.displayText/)
  assert.match(questionAuthorItem, /!isReported\s*&&\s*translate\.canTranslate\s*\?/)

  assert.doesNotMatch(chatRoom, /shouldShowTranslateButton|sourceLang/)
  assert.match(chatRoom, /useTranslateToggle\(\{\s*text:\s*text\s*\?\?\s*"",\s*isAuthenticated\s*\}\)/)
  assert.match(chatRoom, /isAuthenticated\s*&&\s*!message\.pending\s*&&\s*message\.hasText\s*&&\s*translate\.canTranslate/)
  assert.match(chatRoom, /text=\{translate\.displayText\}/)
})
