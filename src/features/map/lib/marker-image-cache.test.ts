import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { MarkerImageCache } from "./marker-image-cache.ts"

function makeFakeCtx() {
  return {
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    clip: () => {},
    drawImage: () => {},
    getImageData: () => ({ width: 44, height: 44, data: new Uint8ClampedArray(44 * 44 * 4) }),
    fillStyle: "",
  }
}

function makeFakeMap() {
  const images = new Set<string>()
  return {
    hasImage: (id: string) => images.has(id),
    addImage: (id: string) => {
      images.add(id)
    },
  }
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

test("같은 URL을 다시 요청하면 캐시된 imageId를 돌려주고 다시 fetch하지 않는다", async () => {
  let fetchCount = 0
  const map = makeFakeMap()
  const cache = new MarkerImageCache(map, {
    fetchBitmap: async () => {
      fetchCount++
      return { width: 40, height: 40 } as ImageBitmap
    },
    createCanvas: () => ({ getContext: () => makeFakeCtx() }) as unknown as OffscreenCanvas,
  })

  const firstId = await new Promise<string>((resolve) => {
    const cached = cache.getOrLoad("https://example.com/a.jpg", resolve)
    assert.equal(cached, null)
  })

  const secondId = cache.getOrLoad("https://example.com/a.jpg", () => {
    throw new Error("캐시 히트에서는 onReady가 다시 불리면 안 된다")
  })

  assert.equal(secondId, firstId)
  assert.equal(fetchCount, 1)
  assert.ok(map.hasImage(firstId))
})

test("같은 URL을 동시에 두 번 요청하면 fetch는 한 번만 나가고 둘 다 같은 id를 받는다", async () => {
  let fetchCount = 0
  const map = makeFakeMap()
  const cache = new MarkerImageCache(map, {
    fetchBitmap: async () => {
      fetchCount++
      return { width: 40, height: 40 } as ImageBitmap
    },
    createCanvas: () => ({ getContext: () => makeFakeCtx() }) as unknown as OffscreenCanvas,
  })

  const readyIds: string[] = []
  cache.getOrLoad("https://example.com/c.jpg", (id) => readyIds.push(id))
  cache.getOrLoad("https://example.com/c.jpg", (id) => readyIds.push(id))

  await flushMicrotasks()

  assert.equal(fetchCount, 1)
  assert.equal(readyIds.length, 2)
  assert.equal(readyIds[0], readyIds[1])
})

test("로드 실패 후에는 캐시에 남지 않아 다음 호출에서 다시 시도한다", async () => {
  let attempts = 0
  const map = makeFakeMap()
  const cache = new MarkerImageCache(map, {
    fetchBitmap: async () => {
      attempts++
      if (attempts === 1) throw new Error("네트워크 오류")
      return { width: 40, height: 40 } as ImageBitmap
    },
    createCanvas: () => ({ getContext: () => makeFakeCtx() }) as unknown as OffscreenCanvas,
  })

  const firstCallReady: string[] = []
  cache.getOrLoad("https://example.com/b.jpg", (id) => firstCallReady.push(id))
  await flushMicrotasks()
  assert.deepEqual(firstCallReady, [])

  const retried = await new Promise<string>((resolve) => {
    cache.getOrLoad("https://example.com/b.jpg", resolve)
  })

  assert.equal(attempts, 2)
  assert.ok(retried.startsWith("pin-thumb-"))
})
