import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { adminKo } from "../../../../lib/i18n/messages/admin.ts"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { formatParticipantCount, getContentResolvedLabel, getContentStatusLabel, getMeetingStatusLabel, getResolvedLabel } from "./admin-content-labels.ts"

test("관리자 질문은 해결 여부만 한국어 라벨로 표시한다", () => {
  assert.equal(getResolvedLabel(true, { admin: adminKo }), "해결됨")
  assert.equal(getResolvedLabel(false, { admin: adminKo }), "미해결")
  assert.equal(getResolvedLabel(null, { admin: adminKo }), "해당 없음")
  assert.equal(getContentResolvedLabel("question", true, { admin: adminKo }), "해결됨")
  assert.equal(getContentResolvedLabel("meeting", true, { admin: adminKo }), "해당 없음")
  assert.equal(getContentStatusLabel("question", "deleted", "ko", { admin: adminKo }), "해당 없음")
})

test("관리자 모임은 실제 모임 상태와 참여자 수만 표시한다", () => {
  assert.equal(getMeetingStatusLabel("open", "ko", { admin: adminKo }), "모집 중")
  assert.equal(getMeetingStatusLabel("closed", "ko", { admin: adminKo }), "마감")
  assert.equal(getMeetingStatusLabel("cancelled", "ko", { admin: adminKo }), "취소됨")
  assert.equal(getMeetingStatusLabel(null, "ko", { admin: adminKo }), "해당 없음")
  assert.equal(getMeetingStatusLabel("archived", "ko", { admin: adminKo }), "archived")
  assert.equal(getContentStatusLabel("meeting", "open", "ko", { admin: adminKo }), "모집 중")
})

test("관리자 콘텐츠 참여자 수는 숫자 또는 해당 없음으로 표시한다", () => {
  const formatter = new Intl.NumberFormat("ko")

  assert.equal(formatParticipantCount("meeting", 12, formatter, { admin: adminKo }), "12")
  assert.equal(
    formatParticipantCount("question", 12, formatter, { admin: adminKo }),
    "해당 없음",
  )
  assert.equal(
    formatParticipantCount("meeting", null, formatter, { admin: adminKo }),
    "해당 없음",
  )
})
