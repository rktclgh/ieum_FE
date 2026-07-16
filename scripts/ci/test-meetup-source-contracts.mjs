import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const form = fs.readFileSync("src/features/meetup/hooks/use-create-meetup-form.ts", "utf8")
const screen = fs.readFileSync("src/features/meetup/components/create-meetup-screen.tsx", "utf8")
const picker = fs.readFileSync("src/features/meetup/components/meetup-date-picker.tsx", "utf8")
const selectField = fs.readFileSync("src/features/meetup/components/meetup-select-field.tsx", "utf8")
const localeFiles = ["ko", "en", "ja", "vi", "ru", "th", "zh"]

test("날짜 미정은 폼의 명시적 상태로 날짜와 시간을 함께 초기화한다", () => {
  assert.match(form, /const \[isDateUndecided, setIsDateUndecided\] = React\.useState\(false\)/)
  assert.match(
    form,
    /const setDateSelection = \(\{ date, isDateUndecided \}: MeetupDateSelection\) => \{[\s\S]*setIsDateUndecided\(isDateUndecided\)[\s\S]*setDate\(isDateUndecided \? null : date\)[\s\S]*setTime\(null\)/
  )
  assert.match(form, /hasCompleteMeetupSchedule\(\{ date, time, isDateUndecided \}\)/)
})

test("날짜 미정은 시간 선택을 native disabled로 만들고 schedule을 조건부로 보낸다", () => {
  assert.match(screen, /value=\{form\.isDateUndecided \? t\.dateUndecidedLabel : dateValue\}/)
  assert.match(screen, /disabled=\{form\.isDateUndecided\}/)
  assert.match(screen, /\.\.\.\(schedule \? \{ schedule \} : \{\}\)/)
  assert.doesNotMatch(screen, /if \(!form\.date \|\| !form\.time \|\| !form\.place\) return/)
  assert.match(selectField, /disabled\?: boolean/)
  assert.match(selectField, /disabled=\{disabled\}/)
})

test("날짜 미정 선택은 접근 가능한 체크 상태와 휠 비활성화로 노출한다", () => {
  assert.match(picker, /role="checkbox"/)
  assert.match(picker, /aria-checked=\{isDateUndecided\}/)
  assert.match(picker, /pointer-events-none opacity-40/)
  assert.match(screen, /onConfirm=\{form\.setDateSelection\}/)
})

test("날짜 미정 라벨은 모든 지원 언어에 있다", () => {
  for (const locale of localeFiles) {
    const source = fs.readFileSync(`src/lib/i18n/messages/${locale}.ts`, "utf8")
    assert.match(source, /dateUndecidedLabel:/, `${locale} is missing dateUndecidedLabel`)
  }
})
