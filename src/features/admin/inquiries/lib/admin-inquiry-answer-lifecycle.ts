import type { QueryClient } from "@tanstack/react-query"

import type {
  AdminInquiryItem,
  AnswerInquiryRequest,
} from "../api/admin-inquiries-api"
import {
  isAdminInquiryAnswerConvergenceLocked,
  reduceAdminInquiryAnswerConvergence,
} from "./admin-inquiry"
import type {
  AdminInquiryAnswerConvergenceReason,
  AdminInquiryAnswerConvergenceState,
} from "./admin-inquiry"
import {
  getSessionAbortSignal,
  getSessionGeneration,
  isSessionGenerationCurrent,
} from "../../../session/lib/session-cache"

const adminInquiryAnswerLifecycleKey = [
  "admin",
  "inquiries",
  "answer-lifecycles",
] as const
const adminInquiryAnswerMutationKey = [
  "admin",
  "inquiries",
  "answer",
] as const
const adminInquiryListKey = ["admin", "inquiries", "list"] as const

interface AdminInquiryAnswerInput {
  inquiry: AdminInquiryItem
  answer: string
}

interface AdminInquiryAnswerExecution extends AdminInquiryAnswerInput {
  operationId: number
  sessionGeneration: number
}

interface AdminInquiryAnswerLifecycle {
  operationId: number
  sessionGeneration: number
  inquiry: AdminInquiryItem
  answer: string
  state: AdminInquiryAnswerConvergenceState
  settledReason: AdminInquiryAnswerConvergenceReason | null
  mutationError: unknown | null
  snapshot: AdminInquiryItem | null
}

interface AdminInquiryAnswerLifecycleRegistry {
  nextOperationId: number
  records: Record<string, AdminInquiryAnswerLifecycle>
}

interface AdminInquiryAnswerLifecycleDependencies {
  answerInquiry: (
    inquiryId: number,
    body: AnswerInquiryRequest,
  ) => Promise<void>
  getCanonicalInquiry: (
    inquiryId: number,
    options?: { signal?: AbortSignal },
  ) => Promise<AdminInquiryItem>
  invalidateInquiries: () => Promise<unknown>
  isAlreadyAnsweredError: (error: unknown) => boolean
  refetchActiveLists: () => Promise<unknown>
}

const initialAdminInquiryAnswerLifecycleRegistry:
  AdminInquiryAnswerLifecycleRegistry = {
    nextOperationId: 1,
    records: {},
  }

const convergenceControllers = new WeakMap<
  QueryClient,
  Map<
    number,
    {
      operationId: number
      sessionGeneration: number
      controller: AbortController
      detachSessionAbort: () => void
    }
  >
>()

function refetchActiveAdminInquiryLists(queryClient: QueryClient) {
  return queryClient.refetchQueries(
    { queryKey: adminInquiryListKey, type: "active" },
    { cancelRefetch: true, throwOnError: true },
  )
}

function getAdminInquiryAnswerLifecycleRegistry(queryClient: QueryClient) {
  return (
    queryClient.getQueryData<AdminInquiryAnswerLifecycleRegistry>(
      adminInquiryAnswerLifecycleKey,
    ) ?? initialAdminInquiryAnswerLifecycleRegistry
  )
}

function getAdminInquiryAnswerLifecycle(
  queryClient: QueryClient,
  inquiryId: number,
) {
  return getAdminInquiryAnswerLifecycleRegistry(queryClient).records[
    String(inquiryId)
  ]
}

function updateAdminInquiryAnswerLifecycle(
  queryClient: QueryClient,
  execution: Pick<
    AdminInquiryAnswerExecution,
    "inquiry" | "operationId" | "sessionGeneration"
  >,
  update: (
    current: AdminInquiryAnswerLifecycle,
  ) => AdminInquiryAnswerLifecycle,
) {
  let updated = false

  if (
    !isSessionGenerationCurrent(queryClient, execution.sessionGeneration)
  ) {
    return updated
  }

  queryClient.setQueryData<AdminInquiryAnswerLifecycleRegistry>(
    adminInquiryAnswerLifecycleKey,
    (previous) => {
      if (previous === undefined) return undefined

      const key = String(execution.inquiry.inquiryId)
      const current = previous.records[key]
      if (
        current?.operationId !== execution.operationId ||
        current.sessionGeneration !== execution.sessionGeneration
      ) {
        return previous
      }

      updated = true
      return {
        ...previous,
        records: {
          ...previous.records,
          [key]: update(current),
        },
      }
    },
  )

  return updated
}

function claimAdminInquiryAnswer(
  queryClient: QueryClient,
  input: AdminInquiryAnswerInput,
): AdminInquiryAnswerExecution | null {
  let execution: AdminInquiryAnswerExecution | null = null
  const sessionGeneration = getSessionGeneration(queryClient)

  queryClient.setQueryData<AdminInquiryAnswerLifecycleRegistry>(
    adminInquiryAnswerLifecycleKey,
    (previous) => {
      const registry = previous ?? initialAdminInquiryAnswerLifecycleRegistry
      const current = registry.records[String(input.inquiry.inquiryId)]
      if (
        current !== undefined &&
        isAdminInquiryAnswerConvergenceLocked(current.state)
      ) {
        return registry
      }

      execution = {
        ...input,
        operationId: registry.nextOperationId,
        sessionGeneration,
      }
      return {
        nextOperationId: registry.nextOperationId + 1,
        records: {
          ...registry.records,
          [String(input.inquiry.inquiryId)]: {
            ...input,
            operationId: registry.nextOperationId,
            sessionGeneration,
            state: { kind: "mutation" },
            settledReason: null,
            mutationError: null,
            snapshot: null,
          },
        },
      }
    },
  )

  return execution
}

function beginAdminInquiryAnswerConvergence(
  queryClient: QueryClient,
  execution: AdminInquiryAnswerExecution,
  reason: AdminInquiryAnswerConvergenceReason,
  mutationError: unknown | null,
) {
  return updateAdminInquiryAnswerLifecycle(
    queryClient,
    execution,
    (current) => ({
      ...current,
      state: reduceAdminInquiryAnswerConvergence(current.state, {
        type: "begin",
        reason,
      }),
      settledReason: reason,
      mutationError,
    }),
  )
}

function getConvergenceController(
  queryClient: QueryClient,
  execution: AdminInquiryAnswerExecution,
) {
  let controllers = convergenceControllers.get(queryClient)
  if (controllers === undefined) {
    controllers = new Map()
    convergenceControllers.set(queryClient, controllers)
  }

  const previous = controllers.get(execution.inquiry.inquiryId)
  previous?.controller.abort()
  previous?.detachSessionAbort()

  const controller = new AbortController()
  const sessionSignal = getSessionAbortSignal(queryClient)
  const abortForSessionReset = () => controller.abort(sessionSignal.reason)
  if (sessionSignal.aborted) {
    abortForSessionReset()
  } else {
    sessionSignal.addEventListener("abort", abortForSessionReset, {
      once: true,
    })
  }
  controllers.set(execution.inquiry.inquiryId, {
    operationId: execution.operationId,
    sessionGeneration: execution.sessionGeneration,
    controller,
    detachSessionAbort: () =>
      sessionSignal.removeEventListener("abort", abortForSessionReset),
  })
  return controller
}

function releaseConvergenceController(
  queryClient: QueryClient,
  execution: AdminInquiryAnswerExecution,
) {
  const controllers = convergenceControllers.get(queryClient)
  const active = controllers?.get(execution.inquiry.inquiryId)
  if (
    active?.operationId !== execution.operationId ||
    active.sessionGeneration !== execution.sessionGeneration
  ) {
    return
  }

  active.detachSessionAbort()
  controllers?.delete(execution.inquiry.inquiryId)
  if (controllers?.size === 0) convergenceControllers.delete(queryClient)
}

function isAdminInquiryAnswerExecutionCurrent(
  queryClient: QueryClient,
  execution: AdminInquiryAnswerExecution,
) {
  if (
    !isSessionGenerationCurrent(queryClient, execution.sessionGeneration)
  ) {
    return false
  }

  const current = getAdminInquiryAnswerLifecycle(
    queryClient,
    execution.inquiry.inquiryId,
  )
  return (
    current?.operationId === execution.operationId &&
    current.sessionGeneration === execution.sessionGeneration
  )
}

async function runAdminInquiryAnswerConvergence(
  queryClient: QueryClient,
  execution: AdminInquiryAnswerExecution,
  dependencies: AdminInquiryAnswerLifecycleDependencies,
) {
  const current = getAdminInquiryAnswerLifecycle(
    queryClient,
    execution.inquiry.inquiryId,
  )
  if (
    current?.operationId !== execution.operationId ||
    current.sessionGeneration !== execution.sessionGeneration ||
    !isSessionGenerationCurrent(queryClient, execution.sessionGeneration) ||
    current.state.kind !== "refreshing"
  ) {
    return
  }

  const refreshingState = current.state
  const controller = getConvergenceController(queryClient, execution)

  try {
    await dependencies.invalidateInquiries()
    if (
      controller.signal.aborted ||
      !isAdminInquiryAnswerExecutionCurrent(queryClient, execution)
    ) {
      return
    }
    await dependencies.refetchActiveLists()
    if (
      controller.signal.aborted ||
      !isAdminInquiryAnswerExecutionCurrent(queryClient, execution)
    ) {
      return
    }
    const canonicalInquiry = await dependencies.getCanonicalInquiry(
      execution.inquiry.inquiryId,
      { signal: controller.signal },
    )
    if (
      controller.signal.aborted ||
      !isAdminInquiryAnswerExecutionCurrent(queryClient, execution)
    ) {
      return
    }
    const nextState = reduceAdminInquiryAnswerConvergence(refreshingState, {
      type: "refetch-succeeded",
      inquiryStatus: canonicalInquiry.status,
    })

    updateAdminInquiryAnswerLifecycle(queryClient, execution, (latest) => ({
      ...latest,
      state: nextState,
      snapshot:
        canonicalInquiry.status === "answered" ? canonicalInquiry : null,
    }))
  } catch {
    if (!isAdminInquiryAnswerExecutionCurrent(queryClient, execution)) return
    updateAdminInquiryAnswerLifecycle(queryClient, execution, (latest) => ({
      ...latest,
      state: reduceAdminInquiryAnswerConvergence(refreshingState, {
        type: "refetch-failed",
      }),
    }))
  } finally {
    releaseConvergenceController(queryClient, execution)
  }
}

function createAdminInquiryAnswerMutationOptions(
  queryClient: QueryClient,
  dependencies: AdminInquiryAnswerLifecycleDependencies,
) {
  return {
    mutationKey: adminInquiryAnswerMutationKey,
    mutationFn: (execution: AdminInquiryAnswerExecution) =>
      dependencies.answerInquiry(execution.inquiry.inquiryId, {
        answer: execution.answer,
      }),
    onSettled: async (
      _data: void | undefined,
      error: unknown | null,
      execution: AdminInquiryAnswerExecution,
    ) => {
      const reason: AdminInquiryAnswerConvergenceReason =
        error === null
          ? "success"
          : dependencies.isAlreadyAnsweredError(error)
            ? "conflict"
            : "uncertain"
      if (
        !beginAdminInquiryAnswerConvergence(
          queryClient,
          execution,
          reason,
          error,
        )
      ) {
        return
      }

      await runAdminInquiryAnswerConvergence(
        queryClient,
        execution,
        dependencies,
      )
    },
  }
}

async function retryAdminInquiryAnswerConvergence(
  queryClient: QueryClient,
  inquiryId: number,
  dependencies: AdminInquiryAnswerLifecycleDependencies,
) {
  let execution: AdminInquiryAnswerExecution | null = null

  queryClient.setQueryData<AdminInquiryAnswerLifecycleRegistry>(
    adminInquiryAnswerLifecycleKey,
    (previous) => {
      if (previous === undefined) return undefined

      const key = String(inquiryId)
      const current = previous.records[key]
      if (current?.state.kind !== "retry") return previous
      if (!isSessionGenerationCurrent(queryClient, current.sessionGeneration)) {
        return previous
      }

      const nextState = reduceAdminInquiryAnswerConvergence(current.state, {
        type: "retry",
      })
      if (nextState.kind !== "refreshing") return previous

      execution = {
        answer: current.answer,
        inquiry: current.inquiry,
        operationId: current.operationId,
        sessionGeneration: current.sessionGeneration,
      }
      return {
        ...previous,
        records: {
          ...previous.records,
          [key]: { ...current, state: nextState },
        },
      }
    },
  )

  if (execution === null) return false
  await runAdminInquiryAnswerConvergence(queryClient, execution, dependencies)
  return true
}

export {
  adminInquiryAnswerLifecycleKey,
  claimAdminInquiryAnswer,
  createAdminInquiryAnswerMutationOptions,
  getAdminInquiryAnswerLifecycle,
  getAdminInquiryAnswerLifecycleRegistry,
  initialAdminInquiryAnswerLifecycleRegistry,
  refetchActiveAdminInquiryLists,
  retryAdminInquiryAnswerConvergence,
}
export type {
  AdminInquiryAnswerExecution,
  AdminInquiryAnswerInput,
  AdminInquiryAnswerLifecycle,
  AdminInquiryAnswerLifecycleDependencies,
  AdminInquiryAnswerLifecycleRegistry,
}
