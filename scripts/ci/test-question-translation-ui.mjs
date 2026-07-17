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
assert.match(
  screen,
  /isAuthenticated\s*=\s*me\.data\s*!=\s*null\s*&&\s*me\.data\.userId\s*!=\s*null/,
  "question screen should not treat unresolved auth as authenticated"
)
assert.match(
  screen,
  /canAccept=\{isAuthor\s*&&\s*isAuthenticated\s*&&\s*!question\.isResolved\s*&&\s*!hasAcceptedAnswer\}/,
  "question author answer accept action must require author authentication"
)
assert.match(
  screen,
  /canAccept=\{false\}/,
  "non-author answer list must not expose answer acceptance"
)
assert.match(
  screen,
  /if\s*\(pendingAcceptId\s*==\s*null\s*\|\|\s*!isAuthor\s*\|\|\s*!isAuthenticated\)\s*return/,
  "answer acceptance mutation must be guarded to question authors only"
)
const contentOverlay = screen.match(
  /\{activeQuestionText\?\.kind === "content"\s*&&\s*\(\s*(<LongPressActionOverlay[\s\S]*?<\/LongPressActionOverlay>)\s*\)\s*\}/
)?.[1]

assert.ok(contentOverlay, "question content long-press overlay should be present")
assert.match(
  contentOverlay,
  /<p className="text-body-regular-14 whitespace-pre-line text-gray-700">\s*\{questionContentTranslate\.displayText\}\s*<\/p>/,
  "question content overlay should render the current translated display text"
)
assert.doesNotMatch(
  contentOverlay,
  /questionContentTranslate\.originalText/,
  "question content overlay should not revert translated content to its original text"
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
    /useTranslateToggle\(\{\s*text:\s*(?:content|answer\.content)/,
    `${name} should translate visible answer text`
  )
  assert.match(
    source,
    /isAuthenticated:/,
    `${name} should pass login-only translation gating`
  )
  assert.match(
    source,
    /hasContent\s*=\s*(?:content|answer\.content)\.trim\(\)\.length\s*>\s*0|answer\.content/,
    `${name} should keep rendering original answer text separately from auth-gated translation`
  )
  assert.match(
    source,
    /translate\.displayText/,
    `${name} should render the temporary translated display text`
  )
}
