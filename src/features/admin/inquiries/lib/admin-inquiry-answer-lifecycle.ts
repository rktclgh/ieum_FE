import type { QueryClient } from "@tanstack/react-query"

import type {
  AdminInquiryItem,
  AdminInquiryStatus,
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

interface AdminInquiryAnswerInput {
  inquiry: AdminInquiryItem
  answer: string
  status: AdminInquiryStatus | ""
  size: number
}

interface AdminInquiryAnswerExecution extends AdminInquiryAnswerInput {
  operationId: number
}

interface AdminInquiryAnswerLifecycle {
  operationId: number
  inquiry: AdminInquiryItem
  answer: string
  status: AdminInquiryStatus | ""
  size: number
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
  findAnsweredInquiry: (
    inquiryId: number,
    options?: { signal?: AbortSignal },
  ) => Promise<AdminInquiryItem | null>
  invalidateInquiries: () => Promise<unknown>
  isAlreadyAnsweredError: (error: unknown) => boolean
  refetchCanonicalList: (params: {
    status: AdminInquiryStatus | ""
    size: number
  }) => Promise<AdminInquiryItem[]>
}

const initialAdminInquiryAnswerLifecycleRegistry:
  AdminInquiryAnswerLifecycleRegistry = {
    nextOperationId: 1,
    records: {},
  }

const convergenceControllers = new WeakMap<
  QueryClient,
  Map<number, { operationId: number; controller: AbortController }>
>()

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
  execution: Pick<AdminInquiryAnswerExecution, "inquiry" | "operationId">,
  update: (
    current: AdminInquiryAnswerLifecycle,
  ) => AdminInquiryAnswerLifecycle,
) {
  let updated = false

  queryClient.setQueryData<AdminInquiryAnswerLifecycleRegistry>(
    adminInquiryAnswerLifecycleKey,
    (previous) => {
      if (previous === undefined) return undefined

      const key = String(execution.inquiry.inquiryId)
      const current = previous.records[key]
      if (current?.operationId !== execution.operationId) return previous

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
      }
      return {
        nextOperationId: registry.nextOperationId + 1,
        records: {
          ...registry.records,
          [String(input.inquiry.inquiryId)]: {
            ...input,
            operationId: registry.nextOperationId,
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

  controllers.get(execution.inquiry.inquiryId)?.controller.abort()
  const controller = new AbortController()
  controllers.set(execution.inquiry.inquiryId, {
    operationId: execution.operationId,
    controller,
  })
  return controller
}

function releaseConvergenceController(
  queryClient: QueryClient,
  execution: AdminInquiryAnswerExecution,
) {
  const controllers = convergenceControllers.get(queryClient)
  const active = controllers?.get(execution.inquiry.inquiryId)
  if (active?.operationId !== execution.operationId) return

  controllers?.delete(execution.inquiry.inquiryId)
  if (controllers?.size === 0) convergenceControllers.delete(queryClient)
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
    current.state.kind !== "refreshing"
  ) {
    return
  }

  const refreshingState = current.state
  const controller = getConvergenceController(queryClient, execution)

  try {
    await dependencies.invalidateInquiries()
    const canonicalItems = await dependencies.refetchCanonicalList({
      status: execution.status,
      size: execution.size,
    })
    const refreshedInquiry = canonicalItems.find(
      (item) => item.inquiryId === execution.inquiry.inquiryId,
    )
    const recoveredInquiry =
      refreshedInquiry === undefined
        ? await dependencies.findAnsweredInquiry(
            execution.inquiry.inquiryId,
            { signal: controller.signal },
          )
        : null
    const canonicalInquiry = refreshedInquiry ?? recoveredInquiry
    const nextState = reduceAdminInquiryAnswerConvergence(refreshingState, {
      type: "refetch-succeeded",
      inquiryStatus: canonicalInquiry?.status ?? "missing",
    })

    updateAdminInquiryAnswerLifecycle(queryClient, execution, (latest) => ({
      ...latest,
      state: nextState,
      snapshot:
        canonicalInquiry?.status === "answered" ? canonicalInquiry : null,
    }))
  } catch {
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

      const nextState = reduceAdminInquiryAnswerConvergence(current.state, {
        type: "retry",
      })
      if (nextState.kind !== "refreshing") return previous

      execution = {
        answer: current.answer,
        inquiry: current.inquiry,
        operationId: current.operationId,
        size: current.size,
        status: current.status,
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
  retryAdminInquiryAnswerConvergence,
}
export type {
  AdminInquiryAnswerExecution,
  AdminInquiryAnswerInput,
  AdminInquiryAnswerLifecycle,
  AdminInquiryAnswerLifecycleDependencies,
  AdminInquiryAnswerLifecycleRegistry,
}
