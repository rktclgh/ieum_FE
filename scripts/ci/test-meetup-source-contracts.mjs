import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const form = fs.readFileSync("src/features/meetup/hooks/use-create-meetup-form.ts", "utf8")
const screen = fs.readFileSync("src/features/meetup/components/create-meetup-screen.tsx", "utf8")
const picker = fs.readFileSync("src/features/meetup/components/meetup-date-picker.tsx", "utf8")
const timePicker = fs.readFileSync("src/features/meetup/components/meetup-time-picker.tsx", "utf8")
const selectField = fs.readFileSync("src/components/ui/text-field/select-field.tsx", "utf8")
const schedule = fs.readFileSync("src/features/meetup/lib/create-meetup-schedule.ts", "utf8")
const meetingTypes = fs.readFileSync("src/features/meetup/api/meetup-types.ts", "utf8")
const meetingRequestTypes = meetingTypes.slice(0, meetingTypes.indexOf("interface MeetingSchedule {"))
const localeFiles = ["ko", "en", "ja", "vi", "ru", "th", "zh"]

test("날짜 미정은 폼의 명시적 상태로 날짜를 함께 초기화한다", () => {
  assert.match(form, /const \[isDateUndecided, setIsDateUndecided\] = React\.useState\(false\)/)
  assert.match(
    form,
    /const setDateSelection = \(\{ date: nextDate, isDateUndecided: nextIsDateUndecided \}: MeetupDateSelection\) => \{[\s\S]*setIsDateUndecided\(nextIsDateUndecided\)[\s\S]*setDate\(nextIsDateUndecided \? null : nextDate\)/
  )
  assert.match(form, /hasCompleteMeetupSchedule\(\{ date, time, isDateUndecided, isTimeUndecided \}\)/)
})

test("날짜 미정은 시간 선택을 native disabled로 만들고 schedule을 조건부로 보낸다", () => {
  assert.match(screen, /value=\{form\.isDateUndecided \? t\.dateUndecidedLabel : dateValue\}/)
  assert.match(screen, /disabled=\{form\.isDateUndecided\}/)
  assert.match(screen, /\.\.\.\(schedule \? \{ schedule \} : \{\}\)/)
  assert.doesNotMatch(screen, /if \(!form\.date \|\| !form\.time \|\| !form\.place\) return/)
  assert.match(selectField, /SelectFieldProps extends Omit<React\.ComponentProps<"button">, "value">/)
  assert.match(selectField, /disabled=\{disabled\}/)
})

test("날짜 미정 선택은 접근 가능한 체크 상태와 휠 비활성화로 노출한다", () => {
  assert.match(picker, /role="checkbox"/)
  assert.match(picker, /aria-checked=\{isDateUndecided\}/)
  assert.match(picker, /focus-visible:ring-2/)
  assert.match(picker, /focus-visible:ring-primary/)
  assert.match(picker, /pointer-events-none opacity-40/)
  assert.match(picker, /inert=\{isDateUndecided\}/)
  assert.match(screen, /onConfirm=\{form\.setDateSelection\}/)
})

test("동일한 날짜를 다시 확정해도 기존 시간은 유지한다", () => {
  assert.match(form, /const isDateChanged =/)
  assert.match(
    form,
    /isDateUndecided !== nextIsDateUndecided \|\|\s*date\?\.year !== nextDate\?\.year \|\|\s*date\?\.month !== nextDate\?\.month \|\|\s*date\?\.day !== nextDate\?\.day/
  )
  assert.match(form, /date\?\.year !== nextDate\?\.year/)
  assert.match(form, /date\?\.month !== nextDate\?\.month/)
  assert.match(form, /date\?\.day !== nextDate\?\.day/)
  assert.match(form, /if \(isDateChanged\) \{\s*setTime\(null\)\s*setIsTimeUndecided\(false\)\s*\}/)
})

test("시간 미정은 폼의 명시적 상태이고 날짜 변경 시 초기화된다", () => {
  assert.match(form, /const \[isTimeUndecided, setIsTimeUndecided\] = React\.useState\(false\)/)
  assert.match(
    form,
    /const setTimeSelection = \(\{ time: nextTime, isTimeUndecided: nextIsTimeUndecided \}: MeetupTimeSelection\) => \{[\s\S]*setIsTimeUndecided\(nextIsTimeUndecided\)[\s\S]*setTime\(nextIsTimeUndecided \? null : nextTime\)/
  )
})

test("일정 헬퍼는 date와 선택적 startTime을 정본으로 보낸다", () => {
  assert.match(schedule, /\/\*\*[\s\S]*\*\/\s*function hasCompleteMeetupSchedule/)
  assert.match(schedule, /\/\*\*[\s\S]*\*\/\s*function buildMeetupSchedule/)
  assert.match(schedule, /return \{ date: toDateKey\(date\) \}/)
  assert.match(schedule, /return \{ date: toDateKey\(date\), startTime: toTimeKey\(time\) \}/)
  assert.doesNotMatch(schedule, /TIME_UNDECIDED_PLACEHOLDER|startsAt:|isTimeUndecided: true/)
  assert.match(meetingRequestTypes, /interface OneTimeMeetingScheduleInput[\s\S]*date: string/)
  assert.match(meetingRequestTypes, /interface RecurringMeetingScheduleInput[\s\S]*date\?: never[\s\S]*startTime: string/)
  assert.doesNotMatch(meetingRequestTypes, /startsAt|isTimeUndecided/)
})

test("시간 미정 선택은 접근 가능한 체크 상태와 휠 비활성화로 노출한다", () => {
  assert.match(timePicker, /role="checkbox"/)
  assert.match(timePicker, /aria-checked=\{isTimeUndecided\}/)
  assert.match(timePicker, /inert=\{isTimeUndecided\}/)
  assert.match(timePicker, /pointer-events-none opacity-40/)
  assert.match(timePicker, /t\.timeUndecidedLabel/)
})

test("시간 미정 확정은 실제 시각 대신 명시적 선택값을 올려보낸다", () => {
  assert.match(timePicker, /onConfirm\(\{ time: null, isTimeUndecided: true \}\)/)
  assert.match(timePicker, /onConfirm\(\{ time: draft, isTimeUndecided: false \}\)/)
})

test("작성 화면은 시간 필드에 시간 미정을 표시하고 선택값을 폼에 넘긴다", () => {
  assert.match(screen, /value=\{form\.isTimeUndecided \? t\.timeUndecidedLabel : timeValue\}/)
  assert.match(screen, /onConfirm=\{form\.setTimeSelection\}/)
  assert.match(screen, /isTimeUndecided: form\.isTimeUndecided/)
})

test("시간 미정 라벨은 모든 지원 언어에 있다", () => {
  for (const locale of localeFiles) {
    const source = fs.readFileSync(`src/lib/i18n/messages/${locale}.ts`, "utf8")
    assert.match(source, /timeUndecidedLabel:/, `${locale} is missing timeUndecidedLabel`)
  }
})

test("날짜 미정 라벨은 모든 지원 언어에 있다", () => {
  for (const locale of localeFiles) {
    const source = fs.readFileSync(`src/lib/i18n/messages/${locale}.ts`, "utf8")
    assert.match(source, /dateUndecidedLabel:/, `${locale} is missing dateUndecidedLabel`)
  }
})
