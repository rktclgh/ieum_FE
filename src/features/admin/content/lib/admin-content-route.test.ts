import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { toAdminContentListPath } from "./admin-content-path.ts"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { routes } from "../../../../lib/navigation/routes.ts"

test("관리자 콘텐츠 목록 API는 백엔드 plural path contract를 사용한다", () => {
  assert.equal(toAdminContentListPath("question"), "questions")
  assert.equal(toAdminContentListPath("meeting"), "meetings")
})

test("관리자 콘텐츠 상세 라우트는 정적 export 가능한 query-param 계약을 사용한다", () => {
  assert.equal(
    routes.adminContentDetail("question", 74),
    "/admin/content/detail/?type=question&contentId=74",
  )
  assert.equal(
    routes.adminContentDetail("meeting", 12),
    "/admin/content/detail/?type=meeting&contentId=12",
  )
})

test("관리자 콘텐츠 상세 라우트는 양의 정수 ID만 허용한다", () => {
  assert.throws(() => routes.adminContentDetail("question", 0), RangeError)
  assert.throws(() => routes.adminContentDetail("meeting", 1.5), RangeError)
})
