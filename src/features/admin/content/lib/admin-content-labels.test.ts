import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { adminKo } from "../../../../lib/i18n/messages/admin.ts"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { formatParticipantCount, getContentStatusLabel, getResolvedLabel } from "./admin-content-labels.ts"

test("관리자 콘텐츠 상태 메타데이터는 한국어 라벨로 표시한다", () => {
  assert.equal(getContentStatusLabel("active", { admin: adminKo }), "활성")
  assert.equal(getContentStatusLabel("deleted", { admin: adminKo }), "삭제됨")
  assert.equal(getResolvedLabel(true, { admin: adminKo }), "해결됨")
  assert.equal(getResolvedLabel(false, { admin: adminKo }), "미해결")
})

test("관리자 콘텐츠 참여자 수는 숫자 또는 해당 없음으로 표시한다", () => {
  const formatter = new Intl.NumberFormat("ko")

  assert.equal(formatParticipantCount(12, formatter, { admin: adminKo }), "12")
  assert.equal(
    formatParticipantCount(null, formatter, { admin: adminKo }),
    "해당 없음",
  )
})
