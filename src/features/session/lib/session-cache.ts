import type { QueryClient, QueryKey } from "@tanstack/react-query"

const ME_QUERY_KEY = ["me"] as const
const PUBLIC_QUERY_META = { sessionScope: "public" } as const
const sessionGenerations = new WeakMap<QueryClient, number>()

function getSessionGeneration(queryClient: QueryClient) {
  return sessionGenerations.get(queryClient) ?? 0
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

async function resetSessionCache(queryClient: QueryClient) {
  sessionGenerations.set(
    queryClient,
    getSessionGeneration(queryClient) + 1,
  )

  const queryCache = queryClient.getQueryCache()
  const meQuery = queryCache.find({ queryKey: ME_QUERY_KEY, exact: true })

  await meQuery?.cancel({ silent: true })
  meQuery?.reset()

  const activePublicQueryKeys: QueryKey[] = []

  for (const query of queryCache.getAll()) {
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

export {
  createSessionMutationCallbacks,
  getSessionGeneration,
  isSessionGenerationCurrent,
  ME_QUERY_KEY,
  PUBLIC_QUERY_META,
  resetSessionCache,
}
