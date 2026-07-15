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
  refetchActiveAdminInquiryLists,
  retryAdminInquiryAnswerConvergence,
} from "../../src/features/admin/inquiries/lib/admin-inquiry-answer-lifecycle.js"
import {
  getAdminInquiryExpandedConvergenceKind,
  isAdminInquiryAnswerConvergenceLocked,
  shouldShowAdminInquiryPageConvergence,
} from "../../src/features/admin/inquiries/lib/admin-inquiry.js"
import type { AdminInquiryItem } from "../../src/features/admin/inquiries/api/admin-inquiries-api.js"
import {
  getSessionGeneration,
  resetSessionCache,
} from "../../src/features/session/lib/session-cache.js"

interface InquiryPage {
  items: AdminInquiryItem[]
  nextCursor: null
}

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

function createInfiniteData(items: AdminInquiryItem[]): InfiniteData<InquiryPage, string | null> {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [null],
  }
}

for (const scenario of ["success", "conflict"] as const) {
  test(`mutation-cache lifecycle converges ${scenario} across pending -> unmount -> all-list remount -> settle`, async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const post = createDeferred<void>()
    const staleAllList = createDeferred<InquiryPage>()
    const conflictError = new Error("already answered")
    const pendingKey = [
      "admin",
      "inquiries",
      "list",
      { status: "pending", size: 20 },
    ] as const
    const allKey = [
      "admin",
      "inquiries",
      "list",
      { status: "", size: 20 },
    ] as const
    const answeredKey = [
      "admin",
      "inquiries",
      "list",
      { status: "answered", size: 20 },
    ] as const
    let pendingFetches = 0
    let allFetches = 0
    let answeredFetches = 0
    let activeListRefetches = 0
    let detailCalls = 0
    let postCalls = 0
    let perCallSettledCalls = 0
    let staleAllListAborted = false

    const pendingOptions = {
      queryKey: pendingKey,
      queryFn: async () => {
        pendingFetches += 1
        return { items: [createInquiry("pending")], nextCursor: null }
      },
      initialPageParam: null as string | null,
      getNextPageParam: (page: InquiryPage) => page.nextCursor,
      staleTime: Infinity,
    }
    const firstListObserver = new InfiniteQueryObserver(queryClient, pendingOptions)
    const unsubscribeFirstList = firstListObserver.subscribe(() => undefined)

    try {
      await firstListObserver.refetch()
      assert.equal(pendingFetches, 1)

      const mutationObserver = new MutationObserver(
        queryClient,
        createAdminInquiryAnswerMutationOptions(queryClient, {
          answerInquiry: async () => {
            postCalls += 1
            await post.promise
            if (scenario === "conflict") throw conflictError
          },
          getCanonicalInquiry: async (inquiryId, { signal } = {}) => {
            detailCalls += 1
            assert.equal(inquiryId, 41)
            assert.equal(signal?.aborted, false)
            return createInquiry("answered")
          },
          invalidateInquiries: () =>
            queryClient.invalidateQueries({
              queryKey: ["admin", "inquiries"],
              refetchType: "none",
            }),
          isAlreadyAnsweredError: (error) => error === conflictError,
          refetchActiveLists: async () => {
            activeListRefetches += 1
            await refetchActiveAdminInquiryLists(queryClient)
          },
        }),
      )
      const unsubscribeMutation = mutationObserver.subscribe(() => undefined)
      const execution = claimAdminInquiryAnswer(queryClient, {
        answer: "Canonical answer",
        inquiry: createInquiry("pending"),
      })

      assert.ok(execution)
      assert.equal(
        claimAdminInquiryAnswer(queryClient, {
          answer: "Duplicate answer",
          inquiry: createInquiry("pending"),
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

      queryClient.setQueryData(allKey, createInfiniteData([createInquiry("pending")]))
      queryClient.setQueryData(answeredKey, createInfiniteData([]))
      const allListObserver = new InfiniteQueryObserver(queryClient, {
        queryKey: allKey,
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          allFetches += 1
          if (allFetches === 1) {
            signal.addEventListener(
              "abort",
              () => {
                staleAllListAborted = true
                staleAllList.reject(signal.reason)
              },
              { once: true },
            )
            return staleAllList.promise
          }
          return { items: [], nextCursor: null }
        },
        initialPageParam: null as string | null,
        getNextPageParam: (page: InquiryPage) => page.nextCursor,
        staleTime: Infinity,
      })
      const answeredListObserver = new InfiniteQueryObserver(queryClient, {
        queryKey: answeredKey,
        queryFn: async () => {
          answeredFetches += 1
          return { items: [], nextCursor: null }
        },
        initialPageParam: null as string | null,
        getNextPageParam: (page: InquiryPage) => page.nextCursor,
        staleTime: Infinity,
      })
      const unsubscribeAllList = allListObserver.subscribe(() => undefined)
      const unsubscribeAnsweredList = answeredListObserver.subscribe(() => undefined)
      assert.equal(allFetches, 0)
      assert.equal(answeredFetches, 0)

      const staleAllListRequest = allListObserver.refetch()
      await waitUntil(() => allFetches === 1)

      post.resolve()
      const mutationError = await mutationResult
      await staleAllListRequest

      assert.equal(postCalls, 1)
      assert.equal(perCallSettledCalls, 0)
      assert.equal(activeListRefetches, 1)
      assert.equal(staleAllListAborted, true)
      assert.equal(pendingFetches, 1)
      assert.equal(allFetches, 2)
      assert.equal(answeredFetches, 1)
      assert.equal(detailCalls, 1)
      assert.equal(mutationError, scenario === "conflict" ? conflictError : null)

      const lifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
      assert.equal(lifecycle?.snapshot?.status, "answered")
      assert.equal(lifecycle?.snapshot?.answer, "Canonical answer")
      assert.equal(lifecycle?.state.kind, scenario === "conflict" ? "conflict-refreshed" : "idle")
      assert.equal(
        isAdminInquiryAnswerConvergenceLocked(lifecycle?.state ?? { kind: "idle" }),
        false,
      )
      assert.deepEqual(allListObserver.getCurrentResult().data?.pages[0]?.items, [])

      unsubscribeAllList()
      unsubscribeAnsweredList()
    } finally {
      post.resolve()
      staleAllList.resolve({ items: [createInquiry("pending")], nextCursor: null })
      queryClient.clear()
    }
  })
}

test("retry remains actionable after remount when the target row is visible but collapsed", async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const allKey = [
    "admin",
    "inquiries",
    "list",
    { status: "", size: 20 },
  ] as const
  let listFetches = 0
  let detailCalls = 0
  const listOptions = {
    queryKey: allKey,
    queryFn: async () => {
      listFetches += 1
      if (listFetches === 2) throw new Error("canonical list refresh failed")
      return {
        items: listFetches === 1 ? [createInquiry("pending")] : [],
        nextCursor: null,
      }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page: InquiryPage) => page.nextCursor,
    staleTime: Infinity,
  }
  const firstListObserver = new InfiniteQueryObserver(queryClient, listOptions)
  const unsubscribeFirstList = firstListObserver.subscribe(() => undefined)

  try {
    await firstListObserver.refetch()
    const dependencies = {
      answerInquiry: async () => undefined,
      getCanonicalInquiry: async () => {
        detailCalls += 1
        return createInquiry("answered")
      },
      invalidateInquiries: () =>
        queryClient.invalidateQueries({
          queryKey: ["admin", "inquiries"],
          refetchType: "none",
        }),
      isAlreadyAnsweredError: () => false,
      refetchActiveLists: () => refetchActiveAdminInquiryLists(queryClient),
    }
    const mutationObserver = new MutationObserver(
      queryClient,
      createAdminInquiryAnswerMutationOptions(queryClient, dependencies),
    )
    const unsubscribeMutation = mutationObserver.subscribe(() => undefined)
    const execution = claimAdminInquiryAnswer(queryClient, {
      answer: "Canonical answer",
      inquiry: createInquiry("pending"),
    })
    assert.ok(execution)

    await mutationObserver.mutate(execution)
    const failedLifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
    assert.equal(listFetches, 2)
    assert.equal(detailCalls, 0)
    assert.equal(failedLifecycle?.state.kind, "retry")
    assert.equal(
      isAdminInquiryAnswerConvergenceLocked(failedLifecycle?.state ?? { kind: "idle" }),
      true,
    )

    unsubscribeMutation()
    unsubscribeFirstList()
    queryClient.setQueryData(allKey, createInfiniteData([createInquiry("pending")]))

    const remountedListObserver = new InfiniteQueryObserver(queryClient, listOptions)
    const unsubscribeRemountedList = remountedListObserver.subscribe(() => undefined)
    const visibleItems =
      remountedListObserver.getCurrentResult().data?.pages.flatMap((page) => page.items) ?? []
    assert.equal(visibleItems.some((item) => item.inquiryId === 41), true)
    assert.equal(listFetches, 2)
    assert.equal(
      shouldShowAdminInquiryPageConvergence(
        failedLifecycle?.state ?? { kind: "idle" },
        41,
        null,
        true,
      ),
      true,
    )
    assert.equal(
      shouldShowAdminInquiryPageConvergence(
        failedLifecycle?.state ?? { kind: "idle" },
        41,
        41,
        true,
      ),
      false,
    )

    assert.equal(
      await retryAdminInquiryAnswerConvergence(queryClient, 41, dependencies),
      true,
    )
    const recoveredLifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
    assert.equal(listFetches, 3)
    assert.equal(detailCalls, 1)
    assert.equal(recoveredLifecycle?.snapshot?.status, "answered")
    assert.equal(recoveredLifecycle?.state.kind, "idle")
    assert.equal(
      isAdminInquiryAnswerConvergenceLocked(recoveredLifecycle?.state ?? { kind: "idle" }),
      false,
    )
    assert.equal(
      shouldShowAdminInquiryPageConvergence(
        recoveredLifecycle?.state ?? { kind: "idle" },
        41,
        null,
        true,
      ),
      false,
    )

    unsubscribeRemountedList()
  } finally {
    queryClient.clear()
  }
})

test("expanded answered row keeps retry ownership when list refetch wins before detail failure", async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const allKey = [
    "admin",
    "inquiries",
    "list",
    { status: "", size: 20 },
  ] as const
  let listFetches = 0
  let detailCalls = 0
  const listOptions = {
    queryKey: allKey,
    queryFn: async () => {
      listFetches += 1
      return {
        items: [createInquiry(listFetches === 1 ? "pending" : "answered")],
        nextCursor: null,
      }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page: InquiryPage) => page.nextCursor,
    staleTime: Infinity,
  }
  const listObserver = new InfiniteQueryObserver(queryClient, listOptions)
  const unsubscribeList = listObserver.subscribe(() => undefined)

  try {
    await listObserver.refetch()
    const dependencies = {
      answerInquiry: async () => undefined,
      getCanonicalInquiry: async () => {
        detailCalls += 1
        if (detailCalls === 1) throw new Error("detail unavailable")
        return createInquiry("answered")
      },
      invalidateInquiries: () =>
        queryClient.invalidateQueries({
          queryKey: ["admin", "inquiries"],
          refetchType: "none",
        }),
      isAlreadyAnsweredError: () => false,
      refetchActiveLists: () => refetchActiveAdminInquiryLists(queryClient),
    }
    const mutationObserver = new MutationObserver(
      queryClient,
      createAdminInquiryAnswerMutationOptions(queryClient, dependencies),
    )
    const unsubscribeMutation = mutationObserver.subscribe(() => undefined)
    const execution = claimAdminInquiryAnswer(queryClient, {
      answer: "Canonical answer",
      inquiry: createInquiry("pending"),
    })
    assert.ok(execution)

    await mutationObserver.mutate(execution)
    const failedLifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
    const answeredListInquiry =
      listObserver.getCurrentResult().data?.pages[0]?.items[0]

    assert.equal(listFetches, 2)
    assert.equal(detailCalls, 1)
    assert.equal(answeredListInquiry?.status, "answered")
    assert.equal(failedLifecycle?.state.kind, "retry")
    assert.equal(
      shouldShowAdminInquiryPageConvergence(
        failedLifecycle?.state ?? { kind: "idle" },
        41,
        41,
        true,
      ),
      false,
    )
    assert.equal(
      getAdminInquiryExpandedConvergenceKind(
        failedLifecycle?.state ?? { kind: "idle" },
      ),
      "retry",
    )

    assert.equal(
      await retryAdminInquiryAnswerConvergence(queryClient, 41, dependencies),
      true,
    )
    const recoveredLifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
    assert.equal(listFetches, 3)
    assert.equal(detailCalls, 2)
    assert.equal(recoveredLifecycle?.state.kind, "idle")
    assert.equal(
      getAdminInquiryExpandedConvergenceKind(
        recoveredLifecycle?.state ?? { kind: "idle" },
      ),
      null,
    )

    unsubscribeMutation()
  } finally {
    unsubscribeList()
    queryClient.clear()
  }
})

for (const [failureName, detailError] of [
  [
    "404",
    Object.assign(new Error("inquiry not found"), {
      response: { data: { code: "INQUIRY_NOT_FOUND" }, status: 404 },
    }),
  ],
  ["network", new Error("network unavailable")],
] as const) {
  test(`detail ${failureName} failure keeps the lifecycle retry-locked until detail recovery`, async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    let detailCalls = 0
    let activeListRefetches = 0
    let detailShouldFail = true
    const dependencies = {
      answerInquiry: async () => undefined,
      getCanonicalInquiry: async () => {
        detailCalls += 1
        if (detailShouldFail) throw detailError
        return createInquiry("answered")
      },
      invalidateInquiries: () =>
        queryClient.invalidateQueries({
          queryKey: ["admin", "inquiries"],
          refetchType: "none",
        }),
      isAlreadyAnsweredError: () => false,
      refetchActiveLists: async () => {
        activeListRefetches += 1
        await refetchActiveAdminInquiryLists(queryClient)
      },
    }
    const mutationObserver = new MutationObserver(
      queryClient,
      createAdminInquiryAnswerMutationOptions(queryClient, dependencies),
    )
    const unsubscribeMutation = mutationObserver.subscribe(() => undefined)

    try {
      const execution = claimAdminInquiryAnswer(queryClient, {
        answer: "Canonical answer",
        inquiry: createInquiry("pending"),
      })
      assert.ok(execution)

      await mutationObserver.mutate(execution)
      const failedLifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
      assert.equal(activeListRefetches, 1)
      assert.equal(detailCalls, 1)
      assert.equal(failedLifecycle?.snapshot, null)
      assert.equal(failedLifecycle?.state.kind, "retry")
      assert.equal(
        isAdminInquiryAnswerConvergenceLocked(failedLifecycle?.state ?? { kind: "idle" }),
        true,
      )

      detailShouldFail = false
      assert.equal(
        await retryAdminInquiryAnswerConvergence(queryClient, 41, dependencies),
        true,
      )
      const recoveredLifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
      assert.equal(activeListRefetches, 2)
      assert.equal(detailCalls, 2)
      assert.equal(recoveredLifecycle?.snapshot?.status, "answered")
      assert.equal(recoveredLifecycle?.state.kind, "idle")
      assert.equal(
        isAdminInquiryAnswerConvergenceLocked(recoveredLifecycle?.state ?? { kind: "idle" }),
        false,
      )
    } finally {
      unsubscribeMutation()
      queryClient.clear()
    }
  })
}

test("session reset aborts old op1 and blocks its delayed detail from overwriting new op1", async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const oldDetail = createDeferred<AdminInquiryItem>()
  let detailCalls = 0
  let oldDetailSignal: AbortSignal | undefined
  const newSessionInquiry = {
    ...createInquiry("answered"),
    answer: "New session answer",
  }
  const dependencies = {
    answerInquiry: async () => undefined,
    getCanonicalInquiry: async (
      _inquiryId: number,
      { signal }: { signal?: AbortSignal } = {},
    ) => {
      detailCalls += 1
      if (detailCalls === 1) {
        oldDetailSignal = signal
        return oldDetail.promise
      }
      return newSessionInquiry
    },
    invalidateInquiries: async () => undefined,
    isAlreadyAnsweredError: () => false,
    refetchActiveLists: async () => undefined,
  }
  const oldMutationObserver = new MutationObserver(
    queryClient,
    createAdminInquiryAnswerMutationOptions(queryClient, dependencies),
  )
  const unsubscribeOldMutation = oldMutationObserver.subscribe(() => undefined)

  try {
    const oldGeneration = getSessionGeneration(queryClient)
    const oldExecution = claimAdminInquiryAnswer(queryClient, {
      answer: "Old session answer",
      inquiry: createInquiry("pending"),
    })
    assert.ok(oldExecution)
    assert.equal(oldExecution.operationId, 1)

    const oldMutationResult = oldMutationObserver.mutate(oldExecution)
    await waitUntil(() => detailCalls === 1)
    assert.equal(
      getAdminInquiryAnswerLifecycle(queryClient, 41)?.state.kind,
      "refreshing",
    )

    await resetSessionCache(queryClient)
    const oldSignalWasAbortedByReset = oldDetailSignal?.aborted ?? false
    assert.equal(getSessionGeneration(queryClient), oldGeneration + 1)

    const newExecution = claimAdminInquiryAnswer(queryClient, {
      answer: "New session answer",
      inquiry: createInquiry("pending"),
    })
    assert.ok(newExecution)
    assert.equal(newExecution.operationId, 1)
    const newMutationObserver = new MutationObserver(
      queryClient,
      createAdminInquiryAnswerMutationOptions(queryClient, dependencies),
    )
    const unsubscribeNewMutation = newMutationObserver.subscribe(() => undefined)

    await newMutationObserver.mutate(newExecution)
    assert.equal(detailCalls, 2)
    assert.equal(
      getAdminInquiryAnswerLifecycle(queryClient, 41)?.snapshot?.answer,
      "New session answer",
    )

    oldDetail.resolve(createInquiry("pending"))
    await oldMutationResult

    const finalLifecycle = getAdminInquiryAnswerLifecycle(queryClient, 41)
    assert.equal(oldSignalWasAbortedByReset, true)
    assert.equal(finalLifecycle?.operationId, 1)
    assert.equal(finalLifecycle?.state.kind, "idle")
    assert.equal(finalLifecycle?.snapshot?.answer, "New session answer")

    unsubscribeNewMutation()
  } finally {
    oldDetail.resolve(createInquiry("pending"))
    unsubscribeOldMutation()
    queryClient.clear()
  }
})
