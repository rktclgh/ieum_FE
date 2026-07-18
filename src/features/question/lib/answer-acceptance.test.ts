import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { resolveAcceptButtonState } from "./answer-acceptance.ts"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import type { QuestionAnswerView } from "./question-adapter.ts"

function makeAnswer(overrides: Partial<QuestionAnswerView> = {}): QuestionAnswerView {
  return {
    answerId: 1,
    isAi: false,
    isAccepted: false,
    authorUserId: 10,
    authorName: "불안핑",
    content: "카페 무브 추천해요",
    createdAt: "2026-07-18T00:00:00Z",
    imageUrls: [],
    ...overrides,
  }
}

const base = {
  isAuthor: true,
  isAuthenticated: true,
  hasAcceptedAnswer: false,
  viewerUserId: 1,
}

test("AI답변에는 채택 버튼을 노출하지 않는다", () => {
  const state = resolveAcceptButtonState({ ...base, answer: makeAnswer({ isAi: true }) })
  assert.equal(state, "hidden")
})

test("질문 작성자가 아니면 채택 버튼을 노출하지 않는다", () => {
  const state = resolveAcceptButtonState({ ...base, isAuthor: false, answer: makeAnswer() })
  assert.equal(state, "hidden")
})

test("로그인하지 않았으면 채택 버튼을 노출하지 않는다", () => {
  const state = resolveAcceptButtonState({ ...base, isAuthenticated: false, answer: makeAnswer() })
  assert.equal(state, "hidden")
})

test("본인이 쓴 답변은 채택할 수 없어 버튼이 사라진다", () => {
  const state = resolveAcceptButtonState({
    ...base,
    viewerUserId: 10,
    answer: makeAnswer({ authorUserId: 10 }),
  })
  assert.equal(state, "hidden")
})

test("채택이 끝나면 채택되지 않은 답변의 버튼이 사라진다", () => {
  const state = resolveAcceptButtonState({ ...base, hasAcceptedAnswer: true, answer: makeAnswer() })
  assert.equal(state, "hidden")
})

test("채택이 끝나면 채택된 답변의 버튼도 사라진다", () => {
  const state = resolveAcceptButtonState({
    ...base,
    hasAcceptedAnswer: true,
    answer: makeAnswer({ isAccepted: true }),
  })
  assert.equal(state, "hidden")
})

test("작성자가 남의 답변을 처음 채택할 때는 활성이다", () => {
  const state = resolveAcceptButtonState({ ...base, answer: makeAnswer() })
  assert.equal(state, "acceptable")
})
