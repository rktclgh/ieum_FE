import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { buildScheduleEditorRequest, isPastScheduleDate } from "./schedule-editor.ts"

test("buildScheduleEditorRequest sends a selected date and PM picker time separately", () => {
  assert.deepEqual(
    buildScheduleEditorRequest({
      selectedDate: "2026-07-16",
      title: "  용산 와인바에서 봅시다  ",
      time: { period: "pm", hour: 7, minute: 5 },
      place: { label: "용산 와인바", address: "서울특별시 용산구" },
    }),
    {
      title: "용산 와인바에서 봅시다",
      locationName: "용산 와인바",
      date: "2026-07-16",
      startTime: "19:05",
    }
  )
})

test("buildScheduleEditorRequest falls back to an address when a place has no label", () => {
  assert.deepEqual(
    buildScheduleEditorRequest({
      selectedDate: "2026-07-16",
      title: "저녁 식사",
      time: { period: "am", hour: 12, minute: 0 },
      place: { address: "서울특별시 용산구 한강대로" },
    }),
    {
      title: "저녁 식사",
      locationName: "서울특별시 용산구 한강대로",
      date: "2026-07-16",
      startTime: "00:00",
    }
  )
})

test("buildScheduleEditorRequest rejects incomplete editor input", () => {
  assert.equal(
    buildScheduleEditorRequest({
      selectedDate: "2026-07-16",
      title: " ",
      time: null,
      place: null,
    }),
    null
  )
})

test("isPastScheduleDate compares calendar choices as KST date keys", () => {
  assert.equal(isPastScheduleDate("2026-07-15", "2026-07-16"), true)
  assert.equal(isPastScheduleDate("2026-07-16", "2026-07-16"), false)
  assert.equal(isPastScheduleDate("2026-07-17", "2026-07-16"), false)
})
