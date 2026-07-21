import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function compact(relativePath) {
  return read(relativePath).replace(/\s+/g, "")
}

function functionBody(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`)
  assert.ok(start >= 0, `missing function ${functionName}`)
  const next = source.indexOf("\nfunction ", start + 1)
  return next >= 0 ? source.slice(start, next) : source.slice(start)
}

test("chat notice API exposes the server contract expected by the UI", () => {
  const api = read("src/features/chat/api/chat-api.ts")
  const types = read("src/features/chat/api/chat-types.ts")
  const queries = read("src/features/chat/hooks/use-chat-queries.ts")
  const mutations = read("src/features/chat/hooks/use-chat-mutations.ts")

  assert.match(types, /interface ChatNoticeResponse/)
  assert.match(types, /interface ChatNoticePage/)
  assert.match(api, /registerChatNotice/)
  assert.match(api, /getChatNotices/)
  assert.match(api, /setChatNoticePin/)
  assert.match(api, /unsetChatNoticePin/)
  assert.match(api, /\/api\/v1\/chat\/rooms\/\$\{roomId\}\/notices/)
  assert.match(queries, /notices:\s*\(roomId:\s*number\)/)
  assert.match(queries, /function useChatNotices/)
  assert.match(functionBody(queries, "useChatNotices"), /useInfiniteQuery/)
  assert.match(functionBody(queries, "useChatNotices"), /fetchNextPage/)
  assert.match(functionBody(queries, "useChatNotices"), /hasNextPage/)
  assert.match(mutations, /function useRegisterChatNotice/)
  assert.match(mutations, /function useSetChatNoticePinned/)
  assert.doesNotMatch(functionBody(mutations, "useSetChatNoticePinned"), /onMutate/)
})

test("chat room notice UI uses backend state instead of mock or local notice state", () => {
  const roomPage = read("src/features/chat/components/chat-room-page-content.tsx")
  const noticePage = read("src/features/chat/components/notice-page-content.tsx")
  const mockData = read("src/features/chat/constants/mock-data.ts")
  const route = compact("src/app/chats/notices/page.tsx")

  assert.doesNotMatch(roomPage, /const\s+\[notice,\s*setNotice\]/)
  assert.doesNotMatch(roomPage, /setNotice\(/)
  assert.match(roomPage, /pinnedNotice/)
  assert.match(roomPage, /useChatNotices\(roomId,\s*session\)/)
  assert.match(roomPage, /useRegisterChatNotice\(\)/)
  assert.doesNotMatch(mockData, /MOCK_NOTICES/)
  assert.doesNotMatch(noticePage, /MOCK_NOTICES/)
  assert.doesNotMatch(noticePage, /setNotices\(/)
  assert.match(noticePage, /roomId:\s*number/)
  assert.match(noticePage, /fetchNextPage/)
  assert.match(noticePage, /hasNextPage/)
  assert.match(route, /<NoticePageContentkey=\{roomId\}roomId=\{roomId\}\/>/)
})

test("notice pin failures surface a localized toast without optimistic local state", () => {
  const noticePage = read("src/features/chat/components/notice-page-content.tsx")
  const messages = read("src/lib/i18n/messages/ko.ts")

  assert.match(noticePage, /import\s+\{\s*AppBar\s*\}[\s\S]*import\s+\{\s*Toast\s*\}/)
  assert.match(noticePage, /noticePinFailed/)
  assert.match(noticePage, /setPinFailed\(true\)/)
  assert.match(noticePage, /<Toast\s+open=\{pinFailed\}\s+message=\{messages\.chat\.noticePinFailed\}/)
  assert.match(messages, /noticePinFailed:\s*string/)
})

test("all chat room types can open the notice UI", () => {
  const roomPage = read("src/features/chat/components/chat-room-page-content.tsx")

  assert.doesNotMatch(roomPage, /!\s*isQuestionRoom\s*&&\s*\(\s*<ChatRoomInfoSection/)
  assert.match(roomPage, /<ChatRoomInfoSection/)
})
