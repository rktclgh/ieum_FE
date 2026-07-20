import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveVisibleCenterOffsetY,
  resolveVisibleCenterPoint,
} from "../../src/features/map/lib/visible-center"
import {
  isSameCoordinate,
  roundCoordinate,
} from "../../src/features/map/lib/coordinate-precision"

const SIZE = { width: 400, height: 800 }

test("인셋이 없으면 보이는 중심은 기하 중심이다", () => {
  assert.deepEqual(resolveVisibleCenterPoint(SIZE), { x: 200, y: 400 })
  assert.equal(resolveVisibleCenterOffsetY(SIZE), 0)
})

test("헤더와 시트를 제외한 영역의 정중앙을 구한다", () => {
  // 보이는 영역: y 100~500, 중심 300
  assert.deepEqual(resolveVisibleCenterPoint({ ...SIZE, topInset: 100, bottomInset: 300 }), {
    x: 200,
    y: 300,
  })
})

test("시트가 헤더보다 크면 보이는 중심이 기하 중심보다 위에 온다", () => {
  assert.equal(resolveVisibleCenterOffsetY({ ...SIZE, topInset: 100, bottomInset: 300 }), -100)
})

test("헤더가 시트보다 크면 보이는 중심이 기하 중심보다 아래에 온다", () => {
  assert.equal(resolveVisibleCenterOffsetY({ ...SIZE, topInset: 300, bottomInset: 100 }), 100)
})

test("시트가 자라면 그 변화량의 절반만큼만 중심이 이동한다", () => {
  // 주변 장소가 로드되며 시트가 200→300으로 자란 상황. 이 델타만큼 지도를 팬해 보정한다.
  const before = resolveVisibleCenterOffsetY({ ...SIZE, topInset: 100, bottomInset: 200 })
  const after = resolveVisibleCenterOffsetY({ ...SIZE, topInset: 100, bottomInset: 300 })

  assert.equal(after - before, -50)
})

test("가려진 영역이 화면을 덮으면 기하 중심으로 되돌린다", () => {
  assert.deepEqual(resolveVisibleCenterPoint({ ...SIZE, topInset: 500, bottomInset: 500 }), {
    x: 200,
    y: 400,
  })
})

test("좌표를 11m 격자로 스냅한다", () => {
  assert.deepEqual(roundCoordinate({ lat: 37.566812, lng: 126.978334 }), {
    lat: 37.5668,
    lng: 126.9783,
  })
})

test("인셋 보정으로 생기는 미세한 좌표 차이는 같은 지점으로 본다", () => {
  // 프로그램적 팬 뒤 되돌아온 중심이 부동소수점 오차만큼 어긋나도 재조회가 나가면 안 된다.
  assert.ok(
    isSameCoordinate({ lat: 37.56680001, lng: 126.97830002 }, { lat: 37.5668, lng: 126.9783 })
  )
})

test("사용자가 지도를 움직여 생긴 실제 이동은 다른 지점으로 본다", () => {
  assert.ok(!isSameCoordinate({ lat: 37.5668, lng: 126.9783 }, { lat: 37.5675, lng: 126.9783 }))
})

test("null 좌표는 서로만 같다", () => {
  assert.ok(isSameCoordinate(null, null))
  assert.ok(!isSameCoordinate(null, { lat: 37.5668, lng: 126.9783 }))
})
