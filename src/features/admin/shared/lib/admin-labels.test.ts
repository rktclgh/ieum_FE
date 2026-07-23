import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { getAdminReportDecisionLabel, getReportAiReviewStateLabel, getReportReasonLabel, getReportStatusLabel, getSanctionTypeLabel, getUserStatusLabel } from "./admin-labels.ts"

test("관리자 신고 코드값은 한국어 운영 라벨로 변환한다", () => {
  assert.equal(getReportReasonLabel("abuse", "ko"), "욕설/비방")
  assert.equal(getReportStatusLabel("ai_reviewed", "ko"), "AI 검토 완료")
  assert.equal(getReportAiReviewStateLabel("completed", "ko"), "완료")
  assert.equal(getAdminReportDecisionLabel("normal", "ko"), "정상")
})

test("관리자 회원/제재 코드값은 한국어 운영 라벨로 변환한다", () => {
  assert.equal(getUserStatusLabel("suspended", "ko"), "정지")
  assert.equal(getSanctionTypeLabel("temporary", "ko"), "일시 정지")
})

test("비한국어 관리자 화면은 기존 API 코드값을 유지한다", () => {
  assert.equal(getReportReasonLabel("abuse", "en"), "abuse")
  assert.equal(getReportStatusLabel("ai_reviewed", "en"), "ai_reviewed")
  assert.equal(getReportAiReviewStateLabel("completed", "en"), "completed")
  assert.equal(getAdminReportDecisionLabel(null, "ko"), "—")
})
