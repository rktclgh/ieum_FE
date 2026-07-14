import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { QueryClient, QueryObserver } from "@tanstack/react-query"

import {
  createSessionMutationCallbacks,
  getSessionGeneration,
  isSessionGenerationCurrent,
  ME_QUERY_KEY,
  PUBLIC_QUERY_META,
  resetSessionCache,
} from "../../src/features/session/lib/session-cache.js"

async function waitUntil(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }

  assert.fail("timed out while waiting for session cache activity")
}

test("overlapping session resets share one reset and a later call starts a new one", async () => {
  const queryClient = new QueryClient()
  const publicQueryKey = ["public", "session-reset-guard"] as const
  const publicFetchResolvers: Array<
    (value: { owner: string }) => void
  > = []
  let publicFetches = 0

  queryClient.setQueryData(publicQueryKey, { owner: "previous-session" })
  const publicObserver = new QueryObserver(queryClient, {
    queryKey: publicQueryKey,
    queryFn: () => {
      publicFetches += 1
      return new Promise<{ owner: string }>((resolve) => {
        publicFetchResolvers.push(resolve)
      })
    },
    meta: PUBLIC_QUERY_META,
    staleTime: Infinity,
  })
  const unsubscribePublic = publicObserver.subscribe(() => undefined)

  try {
    const initialGeneration = getSessionGeneration(queryClient)
    const firstReset = resetSessionCache(queryClient)
    const overlappingReset = resetSessionCache(queryClient)
    const resetAfterSettlement = firstReset.then(() =>
      resetSessionCache(queryClient),
    )
    assert.equal(overlappingReset, firstReset)

    await new Promise<void>((resolve) => setImmediate(resolve))

    assert.equal(getSessionGeneration(queryClient), initialGeneration + 1)
    assert.equal(publicFetches, 1)

    publicFetchResolvers[0]?.({ owner: "first-reset" })
    await waitUntil(() => publicFetches >= 2)

    assert.equal(getSessionGeneration(queryClient), initialGeneration + 2)
    assert.equal(publicFetches, 2)

    publicFetchResolvers[1]?.({ owner: "later-reset" })
    await Promise.all([overlappingReset, resetAfterSettlement])
  } finally {
    for (const resolve of publicFetchResolvers) {
      resolve({ owner: "cleanup" })
    }
    unsubscribePublic()
    queryClient.clear()
  }
})

test("a reset requested during public refetch clears data created after the first scan", async () => {
  const queryClient = new QueryClient()
  const publicQueryKey = ["public", "late-session-reset"] as const
  const privateQueryKey = ["private", "late-session-data"] as const
  const publicFetchResolvers: Array<
    (value: { owner: string }) => void
  > = []
  let publicFetches = 0

  queryClient.setQueryData(publicQueryKey, { owner: "previous-session" })
  const publicObserver = new QueryObserver(queryClient, {
    queryKey: publicQueryKey,
    queryFn: () => {
      publicFetches += 1
      return new Promise<{ owner: string }>((resolve) => {
        publicFetchResolvers.push(resolve)
      })
    },
    meta: PUBLIC_QUERY_META,
    staleTime: Infinity,
  })
  const unsubscribePublic = publicObserver.subscribe(() => undefined)

  try {
    const initialGeneration = getSessionGeneration(queryClient)
    const firstReset = resetSessionCache(queryClient)

    await waitUntil(() => publicFetches >= 1)

    queryClient.setQueryData(ME_QUERY_KEY, {
      userId: 2,
      nickname: "new-session",
    })
    queryClient.setQueryData(privateQueryKey, { owner: "new-session" })
    queryClient.getMutationCache().build(queryClient, {
      mutationKey: ["new-session", "mutation"],
      mutationFn: async () => undefined,
    })

    const lateReset = resetSessionCache(queryClient)
    assert.equal(lateReset, firstReset)
    publicFetchResolvers[0]?.({ owner: "first-reset" })

    await waitUntil(() => publicFetches >= 2)

    assert.equal(getSessionGeneration(queryClient), initialGeneration + 2)
    assert.equal(queryClient.getQueryData(privateQueryKey), undefined)
    assert.equal(queryClient.getMutationCache().getAll().length, 0)

    publicFetchResolvers[1]?.({ owner: "queued-reset" })
    await Promise.all([firstReset, lateReset])
    assert.equal(queryClient.getQueryData(ME_QUERY_KEY), null)
  } finally {
    for (const resolve of publicFetchResolvers) {
      resolve({ owner: "cleanup" })
    }
    unsubscribePublic()
    queryClient.clear()
  }
})

test("the session-expired provider callback reports reset rejections", () => {
  const providerSource = readFileSync(
    "src/lib/query/query-provider.tsx",
    "utf8",
  )

  assert.match(
    providerSource,
    /resetSessionCache\(queryClient\)\.catch\(\(error\)\s*=>\s*\{/,
  )
  assert.match(
    providerSource,
    /console\.error\("Failed to reset session cache",\s*error\)/,
  )
})

test("session reset refetches active public queries and empties active private observers", async () => {
  const queryClient = new QueryClient()
  const user = { userId: 1, nickname: "cached-user" }
  const lateUser = { userId: 2, nickname: "late-user" }
  const privateQueryKey = ["private", "chats"] as const
  const publicQueryKey = ["public", "meetups"] as const
  const inactivePublicQueryKey = ["public", "questions"] as const
  let resolveMeRequest!: (user: typeof lateUser) => void
  const meRequest = new Promise<typeof lateUser>((resolve) => {
    resolveMeRequest = resolve
  })
  let meRequestAborted = false

  queryClient.setQueryData(ME_QUERY_KEY, user)
  queryClient.setQueryData(privateQueryKey, [{ chatId: 10 }])
  queryClient.setQueryData(["me", "permissions"], { canModerate: true })
  queryClient.setQueryData(publicQueryKey, [{ meetingId: 20 }])
  queryClient.setQueryData(inactivePublicQueryKey, [{ questionId: 30 }])

  const meQueryBeforeReset = queryClient.getQueryCache().find({
    queryKey: ME_QUERY_KEY,
    exact: true,
  })
  const observer = new QueryObserver(queryClient, {
    queryKey: ME_QUERY_KEY,
    enabled: false,
    queryFn: ({ signal }) => {
      signal.addEventListener(
        "abort",
        () => {
          meRequestAborted = true
        },
        { once: true },
      )
      return meRequest
    },
  })
  const observedData: unknown[] = []
  const unsubscribe = observer.subscribe((result) => {
    observedData.push(result.data)
  })
  let privateFetches = 0
  const privateObserver = new QueryObserver(queryClient, {
    queryKey: privateQueryKey,
    queryFn: async () => {
      privateFetches += 1
      return [{ chatId: 99 }]
    },
    staleTime: Infinity,
  })
  const observedPrivateData: unknown[] = []
  const unsubscribePrivate = privateObserver.subscribe((result) => {
    observedPrivateData.push(result.data)
  })
  let publicFetches = 0
  const publicObserver = new QueryObserver(queryClient, {
    queryKey: publicQueryKey,
    queryFn: async () => {
      publicFetches += 1
      return [{ meetingId: 99 }]
    },
    meta: PUBLIC_QUERY_META,
    staleTime: Infinity,
  })
  const unsubscribePublic = publicObserver.subscribe(() => undefined)
  const loginMutation = queryClient.getMutationCache().build(queryClient, {
    mutationKey: ["auth", "login"],
    mutationFn: async (variables: { email: string; password: string }) => variables,
  })

  try {
    await loginMutation.execute({ email: "user@example.com", password: "secret" })
    assert.equal(queryClient.getMutationCache().getAll().length, 1)

    const lateMeRefetch = observer.refetch()
    const resetPromise = resetSessionCache(queryClient)

    assert.equal(meRequestAborted, true)
    resolveMeRequest(lateUser)
    await resetPromise
    await lateMeRefetch.catch(() => undefined)

    assert.equal(queryClient.getQueryData(privateQueryKey), undefined)
    assert.equal(queryClient.getQueryData(["me", "permissions"]), undefined)
    assert.deepEqual(queryClient.getQueryData(publicQueryKey), [{ meetingId: 99 }])
    assert.equal(queryClient.getQueryData(inactivePublicQueryKey), undefined)
    assert.equal(
      queryClient.getQueryCache().find({
        queryKey: ["me", "permissions"],
        exact: true,
      }),
      undefined,
    )
    assert.equal(
      queryClient.getQueryCache().find({
        queryKey: inactivePublicQueryKey,
        exact: true,
      }),
      undefined,
    )
    assert.equal(queryClient.getQueryData(ME_QUERY_KEY), null)
    assert.equal(observer.getCurrentResult().data, null)
    assert.equal(privateObserver.getCurrentResult().data, undefined)
    assert.equal(
      queryClient.getQueryCache().find({ queryKey: ME_QUERY_KEY, exact: true }),
      meQueryBeforeReset,
    )
    assert.ok(observedData.includes(null))
    assert.ok(observedPrivateData.includes(undefined))
    assert.equal(queryClient.getMutationCache().getAll().length, 0)

    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(queryClient.getQueryData(ME_QUERY_KEY), null)
    assert.equal(privateFetches, 0)
    assert.equal(publicFetches, 1)
  } finally {
    unsubscribePublic()
    unsubscribePrivate()
    unsubscribe()
    queryClient.removeQueries()
  }
})

test("an expired mutation generation cannot restore private query data", async () => {
  const queryClient = new QueryClient()
  const privateQueryKey = ["questions", "me"] as const
  const previous = [{ questionId: 10, title: "previous user" }]
  const sessionGeneration = getSessionGeneration(queryClient)

  queryClient.setQueryData(privateQueryKey, previous)
  await resetSessionCache(queryClient)

  if (isSessionGenerationCurrent(queryClient, sessionGeneration)) {
    queryClient.setQueryData(privateQueryKey, previous)
  }

  assert.equal(queryClient.getQueryData(privateQueryKey), undefined)
})

test("session reset clears a public query observed only by disabled observers", async () => {
  const queryClient = new QueryClient()
  const publicQueryKey = ["public", "disabled-meetup"] as const
  let publicFetches = 0

  queryClient.setQueryData(publicQueryKey, { owner: "previous-session" })

  const publicObserver = new QueryObserver(queryClient, {
    queryKey: publicQueryKey,
    queryFn: async () => {
      publicFetches += 1
      return { owner: "current-session" }
    },
    enabled: false,
    meta: PUBLIC_QUERY_META,
  })
  const observedPublicData: Array<{ owner: string } | undefined> = []
  const unsubscribePublic = publicObserver.subscribe((result) => {
    observedPublicData.push(result.data)
  })

  try {
    const publicQuery = queryClient.getQueryCache().find({
      queryKey: publicQueryKey,
      exact: true,
    })
    assert.equal(publicQuery?.getObserversCount(), 1)
    assert.equal(publicQuery?.isActive(), false)

    await resetSessionCache(queryClient)

    assert.equal(publicFetches, 0)
    assert.equal(queryClient.getQueryData(publicQueryKey), undefined)
    assert.equal(publicObserver.getCurrentResult().data, undefined)
    assert.equal(observedPublicData.at(-1), undefined)
  } finally {
    unsubscribePublic()
    queryClient.removeQueries()
  }
})

test("a mutation from the current session applies its success data", async () => {
  const queryClient = new QueryClient()
  const previousUser = { userId: 1, nickname: "before-update" }
  const updatedUser = { userId: 1, nickname: "after-update" }
  const generation = getSessionGeneration(queryClient)
  let successCalls = 0

  queryClient.setQueryData(ME_QUERY_KEY, previousUser)
  const profileMutation = queryClient.getMutationCache().build(queryClient, {
    mutationKey: ["my", "profile"],
    mutationFn: async () => updatedUser,
    ...createSessionMutationCallbacks(queryClient, (data: typeof updatedUser) => {
      successCalls += 1
      queryClient.setQueryData(ME_QUERY_KEY, data)
    }),
  })

  try {
    await profileMutation.execute(undefined)

    assert.equal(getSessionGeneration(queryClient), generation)
    assert.equal(successCalls, 1)
    assert.deepEqual(queryClient.getQueryData(ME_QUERY_KEY), updatedUser)
  } finally {
    queryClient.clear()
  }
})

test("a mutation from an expired session cannot overwrite a new identity", async () => {
  const queryClient = new QueryClient()
  const previousUser = { userId: 1, nickname: "previous-session" }
  const lateUser = { userId: 1, nickname: "late-profile-response" }
  const newIdentity = { userId: 1, nickname: "new-session" }
  let resolveProfileMutation!: (user: typeof lateUser) => void
  const profileMutationResponse = new Promise<typeof lateUser>((resolve) => {
    resolveProfileMutation = resolve
  })
  let profileMutationStarted = false

  queryClient.setQueryData(ME_QUERY_KEY, previousUser)
  const profileMutation = queryClient.getMutationCache().build(queryClient, {
    mutationKey: ["my", "profile"],
    mutationFn: () => {
      profileMutationStarted = true
      return profileMutationResponse
    },
    ...createSessionMutationCallbacks(queryClient, (data: typeof lateUser) => {
      queryClient.setQueryData(ME_QUERY_KEY, data)
    }),
  })

  const lateMutation = profileMutation.execute(undefined)
  while (!profileMutationStarted) {
    await Promise.resolve()
  }

  const previousGeneration = getSessionGeneration(queryClient)
  const resetPromise = resetSessionCache(queryClient)

  assert.notEqual(getSessionGeneration(queryClient), previousGeneration)
  await resetPromise
  queryClient.setQueryData(ME_QUERY_KEY, newIdentity)
  resolveProfileMutation(lateUser)
  await lateMutation

  assert.deepEqual(queryClient.getQueryData(ME_QUERY_KEY), newIdentity)
  assert.equal(queryClient.getMutationCache().getAll().length, 0)
})
