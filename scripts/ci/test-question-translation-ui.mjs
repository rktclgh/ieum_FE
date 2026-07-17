import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(path, "utf8")

const screen = read("src/features/question/components/question-detail-screen.tsx")
const answerItem = read("src/features/question/components/question-answer-item.tsx")
const authorItem = read("src/features/question/components/question-answer-author-item.tsx")
const aiCard = read("src/features/question/components/question-ai-answer-card.tsx")

assert.match(
  screen,
  /useTranslateToggle\(\{\s*text:\s*question\?\.title/,
  "question title should use text-based translation toggle"
)
assert.match(
  screen,
  /useTranslateToggle\(\{\s*text:\s*question\?\.content/,
  "question content should use text-based translation toggle"
)
assert.match(
  screen,
  /label:\s*questionTitleTranslate\.(?:isShowingTranslation|isLoading)/,
  "question title long-press menu should expose translate/original label"
)
assert.match(
  screen,
  /label:\s*questionContentTranslate\.(?:isShowingTranslation|isLoading)/,
  "question content long-press menu should expose translate/original label"
)

for (const [name, source] of [
  ["answer item", answerItem],
  ["author answer item", authorItem],
  ["AI answer card", aiCard],
]) {
  assert.doesNotMatch(
    source,
    /useTranslateToggle\(\{\s*resource:/,
    `${name} should not use resource-based translation toggle`
  )
  assert.match(
    source,
    /useTranslateToggle\(\{\s*text:\s*answer\.content/,
    `${name} should translate visible answer text`
  )
  assert.match(
    source,
    /isAuthenticated:/,
    `${name} should pass login-only translation gating`
  )
  assert.match(
    source,
    /hasContent\s*=\s*answer\.content\.trim\(\)\.length\s*>\s*0|answer\.content/,
    `${name} should keep rendering original answer text separately from auth-gated translation`
  )
  assert.match(
    source,
    /translate\.displayText/,
    `${name} should render the temporary translated display text`
  )
}
