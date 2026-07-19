import { strict as assert } from "node:assert"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import { cn } from "@/lib/utils"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"

const has = (classes: string, cls: string) => classes.split(" ").includes(cls)

test("기준(채팅 목록) 트랜지션은 200ms ease-out", () => {
  assert.equal(LONG_PRESS_TRANSITION, "transition-all duration-200 ease-out")
})

test("평상시 상태가 transform 목적지를 명시해야 해제 모션이 생긴다", () => {
  assert.ok(has(LONG_PRESS_INACTIVE, "translate-y-0"))
  assert.ok(has(LONG_PRESS_INACTIVE, "scale-100"))
})

test("리프트 변형은 배경·라운드를 갖지 않는다 (말풍선처럼 고유 표면을 덮으면 안 되는 대상용)", () => {
  assert.doesNotMatch(LONG_PRESS_LIFT_ACTIVE, /\bbg-|\brounded-/)
  assert.ok(has(LONG_PRESS_LIFT_ACTIVE, "-translate-y-1"))
  assert.ok(has(LONG_PRESS_LIFT_ACTIVE, "scale-[1.02]"))
  assert.ok(has(LONG_PRESS_LIFT_ACTIVE, "z-50"))
})

test("표면 변형은 리프트 변형의 상위집합이다 — 두 경로의 모션이 갈라지면 안 된다", () => {
  for (const cls of LONG_PRESS_LIFT_ACTIVE.split(" ")) {
    assert.ok(has(LONG_PRESS_SURFACE_ACTIVE, cls), `표면 변형에 ${cls} 누락`)
  }
  assert.ok(has(LONG_PRESS_SURFACE_ACTIVE, "bg-white"))
  assert.ok(has(LONG_PRESS_SURFACE_ACTIVE, "rounded-2xl"))
})

test("답변 카드: 기본 rounded-xl 이 active 에서 기준 rounded-2xl 로 덮인다", () => {
  const active = cn("flex rounded-xl px-3 py-4", LONG_PRESS_TRANSITION, LONG_PRESS_SURFACE_ACTIVE)
  assert.ok(has(active, "rounded-2xl"))
  assert.ok(!has(active, "rounded-xl"))
  assert.ok(has(active, "bg-white"))

  const idle = cn(
    "flex rounded-xl px-3 py-4",
    LONG_PRESS_TRANSITION,
    cn(LONG_PRESS_INACTIVE, "bg-gray-50")
  )
  assert.ok(has(idle, "rounded-xl"))
  assert.ok(has(idle, "bg-gray-50"))
  assert.ok(!has(idle, "bg-white"))
})

test("리스트 행: active 에서 gap-3 이 gap-2 로 좁혀진다", () => {
  const active = cn(
    "flex items-center gap-3 py-3",
    LONG_PRESS_TRANSITION,
    cn(LONG_PRESS_SURFACE_ACTIVE, "gap-2 px-3")
  )
  assert.ok(has(active, "gap-2"))
  assert.ok(!has(active, "gap-3"))
})

/**
 * 드리프트 방지: 이 상수 모듈이 생긴 이유가 화면마다 리프트 스펙을 복붙해 값이 갈라졌던 것이다.
 * 새 화면이 상수를 쓰지 않고 직접 적어두면 여기서 잡는다.
 */
test("어떤 컴포넌트도 리프트 스펙을 직접 하드코딩하지 않는다", () => {
  const HARDCODED = [/-translate-y-1\s+scale-\[1\.02\]/, /transition-all duration-200 ease-out/]
  const offenders: string[] = []

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(path)
        continue
      }
      if (!/\.tsx$/.test(entry.name)) continue
      const source = readFileSync(path, "utf8")
      if (HARDCODED.some((pattern) => pattern.test(source))) offenders.push(path)
    }
  }
  walk("src")

  assert.deepEqual(
    offenders,
    [],
    `롱프레스 스펙을 하드코딩한 파일:\n${offenders.join("\n")}\n` +
      `@/lib/long-press-styles 의 상수를 조합해 쓸 것.`
  )
})
