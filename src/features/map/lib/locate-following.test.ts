import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { createProgrammaticMoveGate, isLocateFollowingVisible, reduceLocateFollowing } from "./locate-following.ts"

test("내 위치 버튼을 누르면 팔로잉 상태가 켜진다", () => {
  assert.equal(reduceLocateFollowing(false, { type: "recenter-to-me" }), true)
  assert.equal(reduceLocateFollowing(true, { type: "recenter-to-me" }), true)
})

test("사용자가 지도를 움직이면 꺼진다", () => {
  assert.equal(reduceLocateFollowing(true, { type: "user-gesture" }), false)
})

test("내 위치가 아닌 곳으로 재중심하면 꺼진다", () => {
  // 검색 결과 선택, 지도 클릭으로 다른 지점을 고른 경우
  assert.equal(reduceLocateFollowing(true, { type: "recenter-elsewhere" }), false)
})

test("꺼진 상태에서 끄는 이벤트가 와도 꺼진 채로 남는다", () => {
  assert.equal(reduceLocateFollowing(false, { type: "user-gesture" }), false)
  assert.equal(reduceLocateFollowing(false, { type: "recenter-elsewhere" }), false)
})

test("내 위치를 모르면 요청 상태와 무관하게 표시하지 않는다", () => {
  assert.equal(isLocateFollowingVisible(true, null), false)
  assert.equal(isLocateFollowingVisible(true, undefined), false)
  assert.equal(isLocateFollowingVisible(true, { lat: 37.5, lng: 127 }), true)
  assert.equal(isLocateFollowingVisible(false, { lat: 37.5, lng: 127 }), false)
})

test("아무 이동도 없으면 지도 이벤트는 사용자 제스처로 본다", () => {
  const gate = createProgrammaticMoveGate()
  assert.equal(gate.isProgrammatic(), false)
})

test("프로그래매틱 이동 구간 안에서는 사용자 제스처가 아니라고 본다", () => {
  const gate = createProgrammaticMoveGate()
  gate.begin()
  assert.equal(gate.isProgrammatic(), true)
  gate.end()
  assert.equal(gate.isProgrammatic(), false)
})

test("연속 재중심으로 구간이 겹쳐도 마지막 이동이 끝나야 닫힌다", () => {
  // flyTo가 끝나기 전에 버튼을 다시 누르면 begin이 두 번 쌓인다.
  // 첫 moveend에서 닫아버리면 남은 애니메이션의 movestart가 사용자 제스처로 오인된다.
  const gate = createProgrammaticMoveGate()
  gate.begin()
  gate.begin()
  gate.end()
  assert.equal(gate.isProgrammatic(), true)
  gate.end()
  assert.equal(gate.isProgrammatic(), false)
})

test("열린 적 없는 구간을 닫아도 음수로 내려가지 않는다", () => {
  // 사용자 드래그의 moveend도 end()를 호출하므로 짝이 맞지 않는 end가 정상적으로 발생한다.
  const gate = createProgrammaticMoveGate()
  gate.end()
  gate.end()
  assert.equal(gate.isProgrammatic(), false)
  gate.begin()
  assert.equal(gate.isProgrammatic(), true)
})

test("reset은 중단된 애니메이션이 남긴 열린 구간을 모두 닫는다", () => {
  const gate = createProgrammaticMoveGate()
  gate.begin()
  gate.begin()
  gate.reset()
  assert.equal(gate.isProgrammatic(), false)
})
