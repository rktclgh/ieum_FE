import assert from "node:assert/strict"
import test from "node:test"

import { imageFileName, saveImage } from "@/lib/files/save-image"

function replaceGlobal(name: string, value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { configurable: true, value })
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous)
    else Reflect.deleteProperty(globalThis, name)
  }
}

function stubFetch(response: { ok: boolean; type?: string }) {
  return replaceGlobal("fetch", async () => ({
    ok: response.ok,
    blob: async () => new Blob(["binary"], { type: response.type ?? "image/jpeg" }),
  }))
}

/** document.createElement("a") 만 가로채 클릭된 앵커를 관찰한다. */
function stubDownloadDom() {
  const anchor = {
    href: "",
    download: "",
    clicked: false,
    click() {
      anchor.clicked = true
    },
    remove() {},
  }
  const restoreDocument = replaceGlobal("document", {
    createElement: () => anchor,
    body: { appendChild: () => {} },
  })
  const restoreUrl = replaceGlobal("URL", {
    createObjectURL: () => "blob:stub",
    revokeObjectURL: () => {},
  })
  return {
    anchor,
    restore: () => {
      restoreUrl()
      restoreDocument()
    },
  }
}

test("URL 에 확장자가 있으면 그대로 파일명으로 쓴다", () => {
  assert.equal(imageFileName("/api/v1/files/7/photo.png", "image/png"), "photo.png")
})

test("확장자가 없으면 MIME 에서 유도한다", () => {
  assert.equal(imageFileName("/api/v1/files/7", "image/png"), "ieum-photo.png")
})

test("image/jpeg 는 jpg 확장자로 정규화한다", () => {
  assert.equal(imageFileName("/api/v1/files/7", "image/jpeg"), "ieum-photo.jpg")
})

test("공유가 가능하면 공유시트를 쓴다", async () => {
  const restoreFetch = stubFetch({ ok: true })
  let sharedName = ""
  const restoreNavigator = replaceGlobal("navigator", {
    canShare: () => true,
    share: async (data: { files: File[] }) => {
      sharedName = data.files[0].name
    },
  })

  assert.equal(await saveImage("/api/v1/files/7/photo.png"), "shared")
  assert.equal(sharedName, "photo.png")

  restoreNavigator()
  restoreFetch()
})

test("사용자가 공유시트를 닫으면 실패가 아니라 취소다", async () => {
  const restoreFetch = stubFetch({ ok: true })
  const restoreNavigator = replaceGlobal("navigator", {
    canShare: () => true,
    share: async () => {
      const error = new Error("share canceled")
      error.name = "AbortError"
      throw error
    },
  })

  assert.equal(await saveImage("/api/v1/files/7/photo.png"), "cancelled")

  restoreNavigator()
  restoreFetch()
})

test("공유를 지원하지 않으면 다운로드로 폴백한다", async () => {
  const restoreFetch = stubFetch({ ok: true, type: "image/png" })
  const restoreNavigator = replaceGlobal("navigator", {})
  const dom = stubDownloadDom()

  assert.equal(await saveImage("/api/v1/files/7"), "downloaded")
  assert.equal(dom.anchor.download, "ieum-photo.png")
  assert.ok(dom.anchor.clicked)

  dom.restore()
  restoreNavigator()
  restoreFetch()
})

test("응답이 실패면 failed 를 돌려준다", async () => {
  const restoreFetch = stubFetch({ ok: false })
  const restoreNavigator = replaceGlobal("navigator", {})

  assert.equal(await saveImage("/api/v1/files/7"), "failed")

  restoreNavigator()
  restoreFetch()
})

test("네트워크 예외를 삼키고 failed 를 돌려준다", async () => {
  const restoreFetch = replaceGlobal("fetch", async () => {
    throw new Error("offline")
  })
  const restoreNavigator = replaceGlobal("navigator", {})

  assert.equal(await saveImage("/api/v1/files/7"), "failed")

  restoreNavigator()
  restoreFetch()
})
