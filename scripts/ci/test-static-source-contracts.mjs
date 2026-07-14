import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(entryPath)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : []
  })
}

test("fixed query pages validate IDs before mounting data content", () => {
  const pages = [
    {
      path: "src/app/chats/room/page.tsx",
      params: ["chatId"],
      content: "<ChatRoomPageContent",
    },
    {
      path: "src/app/chats/notices/page.tsx",
      params: ["chatId"],
      content: "<NoticePageContent",
    },
    {
      path: "src/app/chats/report/page.tsx",
      params: ["chatId", "messageId"],
      content: "<ReportPageContent",
    },
    {
      path: "src/app/chats/schedule/page.tsx",
      params: ["chatId"],
      content: "<SchedulePageContent",
    },
    {
      path: "src/app/meetups/detail/page.tsx",
      params: ["meetingId"],
      content: "<MeetupDetailContainer",
    },
    {
      path: "src/app/questions/detail/page.tsx",
      params: ["questionId"],
      content: "<QuestionDetailScreen",
    },
  ]

  for (const page of pages) {
    const source = read(page.path)
    assert.match(source, /<React\.Suspense\b/, `${page.path} must own a Suspense boundary`)
    for (const parameter of page.params) {
      assert.ok(
        source.includes(`parsePositiveInteger(searchParams.get("${parameter}"))`),
        `${page.path} must validate ${parameter}`,
      )
    }
    const invalidGuard = source.indexOf("=== null")
    const contentMount = source.indexOf(page.content)
    assert.ok(invalidGuard >= 0, `${page.path} must reject an invalid ID`)
    assert.ok(contentMount > invalidGuard, `${page.path} must guard before mounting content`)
  }
})

test("source contains no legacy runtime-ID navigation templates", () => {
  const legacyNavigation =
    /(?:router\.(?:push|replace)\(|href=\{)\s*`\/(?:chats|meetups|questions)\/\$\{/

  for (const file of sourceFiles(path.join(repoRoot, "src"))) {
    const source = fs.readFileSync(file, "utf8")
    assert.doesNotMatch(source, legacyNavigation, path.relative(repoRoot, file))
  }
})

test("auth gates, session reset subscription, and login invalidation stay wired", () => {
  assert.match(read("src/app/my/layout.tsx"), /<AuthGate policy="protected">/)
  assert.match(read("src/app/login/page.tsx"), /<AuthGate policy="guest-only">/)
  assert.match(read("src/app/join/page.tsx"), /<AuthGate policy="guest-only">/)
  assert.doesNotMatch(read("src/app/join/social/page.tsx"), /\bAuthGate\b/)

  const provider = read("src/lib/query/query-provider.tsx")
  assert.match(provider, /subscribeSessionExpired\(\(\) => \{/)
  assert.match(provider, /resetSessionCache\(queryClient\)/)

  const invalidation = /invalidateQueries\(\{\s*queryKey: ME_QUERY_KEY, exact: true\s*\}\)/g
  assert.equal(read("src/features/login/hooks/use-login-mutations.ts").match(invalidation)?.length, 1)
  assert.equal(
    read("src/features/social-login/hooks/use-social-mutations.ts").match(invalidation)?.length,
    2,
  )
})

test("REST, map, and WebSocket consumers keep the same-origin transport contract", () => {
  assert.match(read("src/lib/api/client.ts"), /baseURL: DEV_BACKEND_ORIGIN/)

  const socket = read("src/features/chat/lib/chat-socket.ts")
  assert.match(socket, /DEV_BACKEND_ORIGIN \?\? window\.location\.origin/)
  assert.match(socket, /toWebSocketUrl\(origin\)/)

  for (const apiFile of [
    "src/features/map/api/place-search-api.ts",
    "src/features/map/api/reverse-geocode-api.ts",
    "src/features/map/api/geocode-api.ts",
  ]) {
    const source = read(apiFile)
    assert.match(source, /import \{ apiClient \} from "@\/lib\/api\/client"/)
    assert.doesNotMatch(source, /\bfetch\(/)
  }
})
