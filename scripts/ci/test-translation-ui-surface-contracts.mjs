import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function compact(source) {
  return source.replace(/\s+/g, "")
}

test("chat bubbles translate displayed text for authenticated non-pending messages", () => {
  const chatRoom = read("src/features/chat/components/chat-room-page-content.tsx")
  const compactChatRoom = compact(chatRoom)

  assert.match(compactChatRoom, /useTranslateToggle\(\{text:text\?\?"",isAuthenticated\}\)/)
  assert.match(chatRoom, /translate\.displayText/)
  // 게이팅 조건 자체는 chat-message-actions.ts 유닛 테스트가 지킨다. 여기선 배선만 확인한다. (issue #452)
  assert.match(compactChatRoom, /constcanTranslate=canTranslateMessage\(message,\{isAuthenticated\}\)/)
  assert.doesNotMatch(chatRoom, /resource:\s*\{\s*kind:\s*"chatMessage"/)
})

test("notice rows expose translate before pin actions and swap only the title", () => {
  const noticePage = read("src/features/chat/components/notice-page-content.tsx")
  const compactNoticePage = compact(noticePage)

  assert.match(compactNoticePage, /useTranslateToggle\(\{text:notice\.title,isAuthenticated\}\)/)
  assert.match(noticePage, /title={translate\.displayText}/)
  assert.match(compactNoticePage, /\[translateMenuItem,.*\.\.\.menuItems/s)
})

test("schedule rows let authenticated non-hosts translate without exposing cancellation", () => {
  const schedulePage = read("src/features/schedule/components/schedule-page-content.tsx")
  const scheduleItem = read("src/features/schedule/components/schedule-list-item.tsx")
  const compactSchedulePage = compact(schedulePage)

  assert.match(compactSchedulePage, /consttitleTranslate=useTranslateToggle\(\{text:event\.title,isAuthenticated\}\)/)
  assert.match(compactSchedulePage, /constlocationTranslate=useTranslateToggle\(\{text:event\.locationLabel,isAuthenticated\}\)/)
  assert.match(compactSchedulePage, /constcanTranslate=titleTranslate\.canTranslate\|\|locationTranslate\.canTranslate/)
  assert.match(compactSchedulePage, /onMoreClick=\{canTranslate\|\|menuItems\.length>0\?onOpenMenu:undefined\}/)
  assert.match(compactSchedulePage, /menuItems=\{scheduleMenuItems\(event\)\}/)
  assert.match(schedulePage, /buildScheduleActions\(event\)/)
  assert.match(compactSchedulePage, /translatedTitle:titleTranslate\.displayText/)
  assert.match(compactSchedulePage, /translatedLocationLabel:locationTranslate\.displayText/)
  assert.match(compactSchedulePage, /titleTranslate\.toggle\(\)/)
  assert.match(compactSchedulePage, /locationTranslate\.toggle\(\)/)
  assert.doesNotMatch(schedulePage, /scheduleTranslationText|splitScheduleTranslation/)
  assert.match(scheduleItem, /event\.translatedTitle\s*\?\?\s*event\.title/)
  assert.match(scheduleItem, /event\.translatedLocationLabel\s*\?\?\s*event\.locationLabel/)
})

test("in-room notice banners translate only for authenticated users and swap displayed text", () => {
  const noticeBanner = read("src/features/chat/components/notice-banner.tsx")
  const chatRoom = read("src/features/chat/components/chat-room-page-content.tsx")

  assert.match(noticeBanner, /isAuthenticated\??:\s*boolean/)
  assert.match(noticeBanner, /useTranslateToggle\(\{\s*text,\s*isAuthenticated\s*\}\)/)
  assert.match(noticeBanner, /translate\.canTranslate/)
  assert.match(noticeBanner, /translate\.displayText/)
  assert.match(noticeBanner, /translate\.toggle\(\)/)
  assert.match(chatRoom, /<NoticeBanner\s+text=\{notice\}\s+isAuthenticated=\{session\.authenticated\}/)
})
