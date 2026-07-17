import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { adaptAnswer } from "./question-adapter.ts"

test("adaptAnswer preserves an AI answer that has no author", () => {
  const answer = adaptAnswer({
    answerId: 77,
    isAi: true,
    author: null,
    content: "AI 답변",
    isAccepted: false,
    createdAt: "2026-07-17T09:00:00Z",
    imageUrls: [],
  })

  assert.equal(answer.answerId, 77)
  assert.equal(answer.isAi, true)
  assert.equal(answer.authorUserId, null)
  assert.equal(answer.authorName, "")
  assert.equal(answer.authorAvatarUrl, undefined)
  assert.equal(answer.countryFlagSrc, undefined)
  assert.equal(answer.nationalityCode, undefined)
  assert.equal(answer.content, "AI 답변")
  assert.deepEqual(answer.imageUrls, [])
})
