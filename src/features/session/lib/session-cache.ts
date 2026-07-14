import type { QueryClient, QueryKey } from "@tanstack/react-query"

const ME_QUERY_KEY = ["me"] as const
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

function isExactMeQuery(queryKey: QueryKey) {
  return queryKey.length === 1 && queryKey[0] === ME_QUERY_KEY[0]
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

  queryCache.getAll().forEach((query) => {
    if (isExactMeQuery(query.queryKey)) return

    if (query.getObserversCount() > 0) {
      query.reset()
      return
    }

    queryCache.remove(query)
  })

  queryClient.getMutationCache().clear()
  queryClient.setQueryData(ME_QUERY_KEY, null)
}

export {
  getSessionGeneration,
  isSessionGenerationCurrent,
  ME_QUERY_KEY,
  resetSessionCache,
}
