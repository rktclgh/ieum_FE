import type { QueryClient, QueryKey } from "@tanstack/react-query"

const ME_QUERY_KEY = ["me"] as const
const PUBLIC_QUERY_META = { sessionScope: "public" } as const
const sessionGenerations = new WeakMap<QueryClient, number>()
const sessionAbortControllers = new WeakMap<QueryClient, AbortController>()

interface InFlightSessionReset {
  acceptsOverlap: boolean
  rerunRequested: boolean
  promise: Promise<void>
}

const inFlightSessionResets = new WeakMap<
  QueryClient,
  InFlightSessionReset
>()

function getSessionGeneration(queryClient: QueryClient) {
  return sessionGenerations.get(queryClient) ?? 0
}

function getSessionAbortSignal(queryClient: QueryClient) {
  let controller = sessionAbortControllers.get(queryClient)
  if (controller === undefined) {
    controller = new AbortController()
    sessionAbortControllers.set(queryClient, controller)
  }
  return controller.signal
}

function rotateSessionAbortSignal(queryClient: QueryClient) {
  sessionAbortControllers.get(queryClient)?.abort()
  sessionAbortControllers.set(queryClient, new AbortController())
}

function isSessionGenerationCurrent(
  queryClient: QueryClient,
  generation: number | undefined,
) {
  return generation !== undefined && getSessionGeneration(queryClient) === generation
}

function createSessionMutationCallbacks<TData>(
  queryClient: QueryClient,
  onCurrentSessionSuccess: (data: TData) => void,
) {
  return {
    onMutate: () => getSessionGeneration(queryClient),
    onSuccess: (
      data: TData,
      _variables: unknown,
      sessionGeneration: number | undefined,
    ) => {
      if (!isSessionGenerationCurrent(queryClient, sessionGeneration)) return
      onCurrentSessionSuccess(data)
    },
  }
}

function isExactMeQuery(queryKey: QueryKey) {
  return queryKey.length === 1 && queryKey[0] === ME_QUERY_KEY[0]
}

function isPublicQuery(meta: Record<string, unknown> | undefined) {
  return meta?.sessionScope === PUBLIC_QUERY_META.sessionScope
}

async function runSessionCacheReset(
  queryClient: QueryClient,
  onSnapshotCaptured: () => void,
) {
  rotateSessionAbortSignal(queryClient)
  sessionGenerations.set(
    queryClient,
    getSessionGeneration(queryClient) + 1,
  )

  const queryCache = queryClient.getQueryCache()
  const meQuery = queryCache.find({ queryKey: ME_QUERY_KEY, exact: true })

  await meQuery?.cancel({ silent: true })
  meQuery?.reset()

  const activePublicQueryKeys: QueryKey[] = []
  const queries = queryCache.getAll()
  onSnapshotCaptured()

  for (const query of queries) {
    if (isExactMeQuery(query.queryKey)) continue

    if (isPublicQuery(query.meta)) {
      if (query.isActive()) {
        activePublicQueryKeys.push(query.queryKey)
      } else if (query.getObserversCount() === 0) {
        queryCache.remove(query)
      } else {
        await query.cancel({ silent: true })
        query.reset()
      }
      continue
    }

    await query.cancel({ silent: true })
    if (query.getObserversCount() > 0) {
      query.reset()
      continue
    }

    queryCache.remove(query)
  }

  queryClient.getMutationCache().clear()
  queryClient.setQueryData(ME_QUERY_KEY, null)

  await Promise.all(
    activePublicQueryKeys.map((queryKey) =>
      queryClient.resetQueries({ queryKey, exact: true, type: "active" })
    )
  )
}

function resetSessionCache(queryClient: QueryClient) {
  const inFlightReset = inFlightSessionResets.get(queryClient)
  if (inFlightReset) {
    if (!inFlightReset.acceptsOverlap) {
      inFlightReset.rerunRequested = true
    }
    return inFlightReset.promise
  }

  let resolveReset!: () => void
  let rejectReset!: (reason: unknown) => void
  const resetPromise = new Promise<void>((resolve, reject) => {
    resolveReset = resolve
    rejectReset = reject
  })
  const resetState: InFlightSessionReset = {
    acceptsOverlap: true,
    rerunRequested: false,
    promise: resetPromise,
  }
  inFlightSessionResets.set(queryClient, resetState)

  const runReset = async () => {
    do {
      resetState.acceptsOverlap = true
      resetState.rerunRequested = false
      await runSessionCacheReset(queryClient, () => {
        resetState.acceptsOverlap = false
      })
    } while (resetState.rerunRequested)
  }

  const clearResetState = () => {
    if (inFlightSessionResets.get(queryClient) === resetState) {
      inFlightSessionResets.delete(queryClient)
    }
  }

  void runReset().then(
    () => {
      clearResetState()
      resolveReset()
    },
    (reason: unknown) => {
      clearResetState()
      rejectReset(reason)
    },
  )

  return resetPromise
}

export {
  createSessionMutationCallbacks,
  getSessionAbortSignal,
  getSessionGeneration,
  isSessionGenerationCurrent,
  ME_QUERY_KEY,
  PUBLIC_QUERY_META,
  resetSessionCache,
}
