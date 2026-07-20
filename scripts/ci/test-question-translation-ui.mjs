import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(path, "utf8")

// question-detail-screen.tsx / question-answer-item.tsx / question-answer-author-item.tsx were
// deleted when the 질문 상세 screen was replaced by the author-only 답변 보기 screen
// (answer-view-screen.tsx + answer-card.tsx). These assertions were rewritten against the
// current implementation, preserving intent: answer text must remain translatable via
// long-press, gated by login, without permanently overwriting the original text.
const screen = read("src/features/question/components/answer-view-screen.tsx")
const card = read("src/features/question/components/answer-card.tsx")
const aiCard = read("src/features/question/components/question-ai-answer-card.tsx")

assert.match(
  screen,
  /viewerUserId\s*=\s*me\.data\?\.userId\s*\?\?\s*null/,
  "answer view screen should not treat an unresolved session as an authenticated viewer"
)
assert.match(
  screen,
  /isAuthenticated\s*=\s*viewerUserId\s*!=\s*null/,
  "answer view screen should derive authentication from a resolved viewer id"
)

assert.match(
  screen,
  /useTranslateToggle\(\{\s*text:\s*answer\.content,\s*isAuthenticated\s*\}\)/,
  "each answer row should use text-based translation toggle gated by authentication"
)
assert.doesNotMatch(
  screen,
  /useTranslateToggle\(\{\s*resource:/,
  "answer view screen should not use resource-based translation toggle"
)
assert.match(
  screen,
  /label:\s*translate\.isLoading\s*\?\s*messages\.translate\.translatingLabel\s*:\s*translate\.isShowingTranslation\s*\?\s*messages\.translate\.viewOriginalLabel\s*:\s*messages\.translate\.menuLabel/,
  "answer long-press menu should expose translate/original/loading labels"
)
assert.match(
  screen,
  /answer=\{\{\s*\.\.\.answer,\s*content:\s*translate\.displayText\s*\}\}/,
  "answer card should render the current translated display text, not the raw original"
)
assert.match(
  screen,
  /translate\.isError/,
  "answer view screen should surface translation failures separately from the answer text"
)

assert.match(
  card,
  /const longPress = useLongPress\(\{ onLongPress \}\)/,
  "answer card should wire long-press to open its context menu"
)
assert.match(
  card,
  /<div\s*\{\.\.\.longPress\}/,
  "answer card should attach the long-press handlers to its wrapper"
)
assert.match(
  card,
  /\{answer\.content\}/,
  "answer card should render whatever content it is given (translated or original) without its own translation state"
)

assert.match(
  aiCard,
  /useTranslateToggle\(\{\s*text:\s*answer\.content,\s*isAuthenticated,?\s*\}\)/,
  "AI answer card should translate visible answer text"
)
assert.match(
  aiCard,
  /translate\.canTranslate/,
  "AI answer card should gate its translate action on canTranslate"
)
assert.match(
  aiCard,
  /\{translate\.displayText\}/,
  "AI answer card should render the temporary translated display text"
)
