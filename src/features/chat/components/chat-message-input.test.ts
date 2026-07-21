import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const componentSource = readFileSync(
  new URL("./chat-message-input.tsx", import.meta.url),
  "utf8"
)

test("전송 버튼은 textarea 포커스를 유지해 모바일 키보드를 닫지 않는다", () => {
  assert.match(componentSource, /const focusInput = \(\) => inputRef\.current\?\.focus\(\)/)
  assert.match(componentSource, /const preserveTextInputFocus = \(event: React\.PointerEvent<HTMLButtonElement>\) => \{\s*event\.preventDefault\(\)\s*focusInput\(\)/)
  assert.match(componentSource, /const handleSend = \(\) => \{[\s\S]*?focusInput\(\)/)
  assert.match(componentSource, /aria-label=\{messages\.chat\.sendButtonLabel\}[\s\S]*?onPointerDown=\{preserveTextInputFocus\}/)
})
