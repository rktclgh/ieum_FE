import assert from "node:assert/strict"
import test from "node:test"

import {
  InfiniteQueryObserver,
  MutationObserver,
  QueryClient,
} from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"

import {
  claimAdminInquiryAnswer,
  createAdminInquiryAnswerMutationOptions,
  getAdminInquiryAnswerLifecycle,
} from "../../src/features/admin/inquiries/lib/admin-inquiry-answer-lifecycle.js"
import { isAdminInquiryAnswerConvergenceLocked } from "../../src/features/admin/inquiries/lib/admin-inquiry.js"
import type { AdminInquiryItem } from "../../src/features/admin/inquiries/api/admin-inquiries-api.js"

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

async function waitUntil(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }

  assert.fail("timed out while waiting for admin inquiry lifecycle activity")
}

function createInquiry(status: "pending" | "answered"): AdminInquiryItem {
  return {
    inquiryId: 41,
    userId: 7,
    userEmail: "member@example.com",
    title: "Account question",
    content: "Please help",
    status,
    answer: status === "answered" ? "Canonical answer" : null,
    answeredBy: status === "answered" ? 3 : null,
    answeredAt: status === "answered" ? "2026-07-15T02:00:00.000Z" : null,
    createdAt: "2026-07-14T02:00:00.000Z",
  }
}

for (const scenario of ["success", "conflict"] as const) {
  test(`mutation-cache lifecycle converges ${scenario} after submit -> unmount -> remount -> settle`, async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const post = createDeferred<void>()
    const staleList = createDeferred<{
      items: AdminInquiryItem[]
      nextCursor: null
    }>()
    const conflictError = new Error("already answered")
    const listKey = ["admin", "inquiries", "list", { status: "pending", size: 20 }] as const
    let listFetches = 0
    let canonicalRefetches = 0
    let postCalls = 0
    let perCallSettledCalls = 0
    let staleListAborted = false

    const listOptions = {
      queryKey: listKey,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        listFetches += 1
        if (listFetches === 2) {
          signal.addEventListener(
            "abort",
            () => {
              staleListAborted = true
              staleList.reject(signal.reason)
            },
            { once: true },
          )
          return staleList.promise
        }
        return {
          items: [createInquiry(listFetches === 1 ? "pending" : "answered")],
          nextCursor: null,
        }
      },
      initialPageParam: null as string | null,
      getNextPageParam: (page: { nextCursor: string | null }) => page.nextCursor,
      staleTime: Infinity,
    }
    const firstListObserver = new InfiniteQueryObserver(queryClient, listOptions)
    const unsubscribeFirstList = firstListObserver.subscribe(() => undefined)

    try {
      await firstListObserver.refetch()
      assert.equal(listFetches, 1)

      const mutationObserver = new MutationObserver(
        queryClient,
        createAdminInquiryAnswerMutationOptions(queryClient, {
          answerInquiry: async () => {
            postCalls += 1
            await post.promise
            if (scenario === "conflict") throw conflictError
          },
          findAnsweredInquiry: async () => null,
          invalidateInquiries: () =>
            queryClient.invalidateQueries({
              queryKey: ["admin", "inquiries"],
              refetchType: "none",
            }),
          isAlreadyAnsweredError: (error) => error === conflictError,
          refetchCanonicalList: async () => {
            canonicalRefetches += 1
            await queryClient.refetchQueries(
              { queryKey: listKey, exact: true, type: "all" },
              { cancelRefetch: true, throwOnError: true },
            )
            const result = queryClient.getQueryData<
              InfiniteData<{
                items: AdminInquiryItem[]
                nextCursor: null
              }, string | null>
            >(listKey)
            assert.ok(result)
            return result.pages.flatMap((page) => page.items)
          },
        }),
      )
      const unsubscribeMutation = mutationObserver.subscribe(() => undefined)
      const execution = claimAdminInquiryAnswer(queryClient, {
        answer: "Canonical answer",
        inquiry: createInquiry("pending"),
        size: 20,
        status: "pending",
      })

      assert.ok(execution)
      assert.equal(
        claimAdminInquiryAnswer(queryClient, {
          answer: "Duplicate answer",
          inquiry: createInquiry("pending"),
          size: 20,
          status: "pending",
        }),
        null,
      )
      assert.equal(
        isAdminInquiryAnswerConvergenceLocked(
          getAdminInquiryAnswerLifecycle(queryClient, 41)?.state ?? { kind: "idle" },
        ),
        true,
      )

      const mutationResult = mutationObserver
        .mutate(execution, {
          onSettled: () => {
            perCallSettledCalls += 1
          },
        })
        .then(
          () => null,
          (error: unknown) => error,
        )
      await waitUntil(() => postCalls === 1)

      unsubscribeMutation()
      unsubscribeFirstList()

      const remountedListObserver = new InfiniteQueryObserver(queryClient, listOptions)
      const unsubscribeRemountedList = remountedListObserver.subscribe(() => undefined)
      assert.equal(listFetches, 1)
      const staleListRequest = remountedListObserver.refetch()
      await waitUntil(() => listFetches === 2)

      post.resolve()
      const mutationError = await mutationResult
      await staleListRequest

      assert.equal(postCalls, 1)
      assert.equal(perCallSettledCalls, 0)
      assert.equal(canonicalRefetches, 1)
      assert.equal(staleListAborted, true)
      assert.equal(listFetches, 3)
      assert.equal(mutationError, scenario === "conflict" ? conflictError : null)

      const lifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
      assert.equal(lifecycle?.snapshot?.status, "answered")
      assert.equal(lifecycle?.snapshot?.answer, "Canonical answer")
      assert.equal(lifecycle?.state.kind, scenario === "conflict" ? "conflict-refreshed" : "idle")
      assert.equal(
        isAdminInquiryAnswerConvergenceLocked(lifecycle?.state ?? { kind: "idle" }),
        false,
      )
      assert.equal(remountedListObserver.getCurrentResult().data?.pages[0]?.items[0]?.status, "answered")

      unsubscribeRemountedList()
    } finally {
      post.resolve()
      staleList.resolve({ items: [createInquiry("pending")], nextCursor: null })
      queryClient.clear()
    }
  })
}
