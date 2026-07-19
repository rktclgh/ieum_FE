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
  assert.match(
    hook,
    /isAuthenticated\s*=\s*false/,
    "translation must be opt-in for authenticated surfaces"
  )
  assert.match(
    hook,
    /visibleTranslation\.translationKey\s*===\s*translationKey\s*\?\s*visibleTranslation\.key\s*:\s*null/,
    "translation state must return to original text when language or source text changes"
  )
  const resetEffect = hook.match(
    /React\.useEffect\(\(\) => \{([\s\S]*?)\},\s*\[reset,\s*translationKey\]\)/
  )?.[1]
  assert.ok(resetEffect, "translation reset effect should depend on the current translation key")
  assert.match(
    resetEffect,
    /^\s*reset\(\)\s*(?:\/\/[^\n]*\n\s*)*setVisibleTranslation\(\{\s*key:\s*null,\s*translationKey\s*\}\)\s*$/,
    "switching away and back must clear active translation visibility in the mutation reset effect"
  )
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
  // question-answer-item.tsx / question-answer-author-item.tsx were deleted when the
  // 질문 상세 screen was replaced by the author-only 답변 보기 screen; the per-answer
  // translation toggle now lives in answer-view-screen.tsx (AnswerRow), with answer-card.tsx
  // as the presentational counterpart that just renders whatever content it is given.
  const screen = read("src/features/question/components/answer-view-screen.tsx")
  const answerCard = read("src/features/question/components/answer-card.tsx")
  const chatRoom = read("src/features/chat/components/chat-room-page-content.tsx")

  assert.doesNotMatch(screen, /shouldShowTranslateButton|sourceLang/)
  assert.match(screen, /useTranslateToggle\(\{\s*text:\s*answer\.content,\s*isAuthenticated\s*\}\)/)
  assert.match(screen, /translate\.canTranslate/)
  assert.match(screen, /translate\.displayText/)

  assert.doesNotMatch(answerCard, /shouldShowTranslateButton|sourceLang|language/)
  assert.match(
    answerCard,
    /<div\s*\{\.\.\.longPress\}/,
    "answer card should keep long-press available on the card wrapper regardless of report state"
  )

  assert.doesNotMatch(chatRoom, /shouldShowTranslateButton|sourceLang/)
  assert.match(chatRoom, /useTranslateToggle\(\{\s*text:\s*text\s*\?\?\s*"",\s*isAuthenticated\s*\}\)/)
  assert.match(chatRoom, /isAuthenticated\s*&&\s*!message\.pending\s*&&\s*message\.hasText\s*&&\s*translate\.canTranslate/)
  assert.match(chatRoom, /text=\{translate\.displayText\}/)
})
