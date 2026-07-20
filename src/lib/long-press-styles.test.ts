import { strict as assert } from "node:assert"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import { cn } from "@/lib/utils"
import {
  LONG_PRESS_ATTRIBUTE,
  LONG_PRESS_INACTIVE,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TARGET_PROPS,
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
  // 리프트 시그니처는 롱프레스에만 쓰이는 조합이라 어느 파일에 있든 드리프트다.
  const LIFT_SIGNATURE = /-translate-y-1\s+scale-\[1\.02\]/
  // 반면 이 트랜지션은 드롭다운·툴팁 등 롱프레스와 무관한 곳에서도 정당하게 쓰일 수 있다.
  // 롱프레스를 다루는 파일에서만 상수 사용을 강제해 오탐을 막는다.
  const BARE_TRANSITION = /transition-all duration-200 ease-out/
  const TOUCHES_LONG_PRESS = /useLongPress|LONG_PRESS_/

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
      if (LIFT_SIGNATURE.test(source)) {
        offenders.push(`${path} (리프트 스펙 하드코딩)`)
      } else if (TOUCHES_LONG_PRESS.test(source) && BARE_TRANSITION.test(source)) {
        offenders.push(`${path} (롱프레스 파일에서 트랜지션 하드코딩)`)
      }
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

/**
 * OS 기본 텍스트 선택 억제.
 *
 * iOS 는 롱프레스에서 selection/callout(Copy·Look Up·Translate)을 contextmenu 와 별개 경로로
 * 띄우기 때문에 JS 의 preventDefault 로 막히지 않는다. CSS 로만 억제할 수 있고, 그 CSS 셀렉터와
 * 훅이 붙이는 속성이 같은 이름을 써야 하므로 이름을 상수 하나로 묶어 어긋남을 막는다.
 */
const globalsCss = readFileSync("src/app/globals.css", "utf8")

test("롱프레스 대상 표시 속성은 data-* 속성이라 DOM 에 그대로 스프레드된다", () => {
  assert.match(LONG_PRESS_ATTRIBUTE, /^data-[a-z-]+$/)
  assert.deepEqual(LONG_PRESS_TARGET_PROPS, { [LONG_PRESS_ATTRIBUTE]: "" })
})

test("globals.css 가 표시 속성 대상의 선택·callout·탭 하이라이트를 모두 끈다", () => {
  const rule = globalsCss.match(
    new RegExp(`\\[${LONG_PRESS_ATTRIBUTE}\\]\\s*\\{([^}]*)\\}`)
  )?.[1]
  assert.ok(rule, `globals.css 에 [${LONG_PRESS_ATTRIBUTE}] 규칙이 없다`)

  // -webkit-touch-callout 이 iOS 편집 메뉴를, user-select 가 선택 핸들을 막는다. 둘 다 필요하다.
  assert.match(rule, /-webkit-touch-callout:\s*none/)
  assert.match(rule, /-webkit-user-select:\s*none/)
  assert.match(rule, /(?<!-webkit-)user-select:\s*none/)
  assert.match(rule, /-webkit-tap-highlight-color:\s*transparent/)
})

test("입력 요소는 예외라 롱프레스 대상 안에서도 커서·선택이 살아 있다", () => {
  const escaped = LONG_PRESS_ATTRIBUTE
  const exception = globalsCss.match(
    new RegExp(`\\[${escaped}\\]\\s+[^{]*(?:input|textarea)[^{]*\\{([^}]*)\\}`)
  )?.[1]
  assert.ok(exception, "input/textarea 예외 규칙이 없다")
  assert.match(exception, /user-select:\s*auto/)
})

test("useLongPress 가 표시 속성을 반환해 호출부 수정 없이 전 화면에 적용된다", () => {
  const hook = readFileSync("src/lib/hooks/use-long-press.ts", "utf8")
  assert.match(
    hook,
    /LONG_PRESS_TARGET_PROPS/,
    "훅이 상수를 스프레드하지 않으면 화면마다 속성을 붙여야 해 누락이 생긴다"
  )
})

test("롱프레스로 열리는 메뉴 자체도 선택 억제 대상이다", () => {
  const menu = readFileSync("src/features/chat/components/chat-context-menu.tsx", "utf8")
  assert.match(
    menu,
    /LONG_PRESS_TARGET_PROPS/,
    "메뉴 항목 텍스트가 선택되면 앱 메뉴 위에 OS 편집 메뉴가 겹친다"
  )
})
