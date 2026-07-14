import assert from "node:assert/strict"
import test from "node:test"

import { QueryClient, QueryObserver } from "@tanstack/react-query"

import {
  getSessionGeneration,
  isSessionGenerationCurrent,
  ME_QUERY_KEY,
  resetSessionCache,
} from "../../src/features/session/lib/session-cache.js"

test("session reset preserves me and empties active private observers", async () => {
  const queryClient = new QueryClient()
  const user = { userId: 1, nickname: "cached-user" }
  const lateUser = { userId: 2, nickname: "late-user" }
  const privateQueryKey = ["private", "chats"] as const
  let resolveMeRequest!: (user: typeof lateUser) => void
  const meRequest = new Promise<typeof lateUser>((resolve) => {
    resolveMeRequest = resolve
  })
  let meRequestAborted = false

  queryClient.setQueryData(ME_QUERY_KEY, user)
  queryClient.setQueryData(privateQueryKey, [{ chatId: 10 }])
  queryClient.setQueryData(["me", "permissions"], { canModerate: true })
  queryClient.setQueryData(["public", "meetups"], [{ meetingId: 20 }])

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
    assert.equal(queryClient.getQueryData(["public", "meetups"]), undefined)
    assert.equal(
      queryClient.getQueryCache().find({
        queryKey: ["me", "permissions"],
        exact: true,
      }),
      undefined,
    )
    assert.equal(
      queryClient.getQueryCache().find({
        queryKey: ["public", "meetups"],
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
  } finally {
    unsubscribePrivate()
    unsubscribe()
    queryClient.removeQueries()
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
    onMutate: () => getSessionGeneration(queryClient),
    onSuccess: (data, _variables, sessionGeneration) => {
      if (!isSessionGenerationCurrent(queryClient, sessionGeneration)) return
      queryClient.setQueryData(ME_QUERY_KEY, data)
    },
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
