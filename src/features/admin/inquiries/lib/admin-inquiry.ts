type AdminInquiryStatus = "pending" | "answered"

type AdminInquiryAnswerConvergenceReason =
  | "success"
  | "conflict"
  | "uncertain"

type AdminInquiryAnswerConvergenceState =
  | { kind: "idle" }
  | { kind: "mutation" }
  | { kind: "refreshing"; reason: AdminInquiryAnswerConvergenceReason }
  | { kind: "retry"; reason: AdminInquiryAnswerConvergenceReason }
  | { kind: "conflict-refreshed" }

type AdminInquiryAnswerConvergenceEvent =
  | { type: "reset" }
  | { type: "begin"; reason: AdminInquiryAnswerConvergenceReason }
  | { type: "retry" }
  | { type: "refetch-failed" }
  | {
      type: "refetch-succeeded"
      inquiryStatus: AdminInquiryStatus
    }

const initialAdminInquiryAnswerConvergenceState = { kind: "idle" } as const

function getAdminInquiryExpandedConvergenceKind(
  state: AdminInquiryAnswerConvergenceState,
) {
  if (state.kind === "retry") return "retry" as const
  if (state.kind === "mutation" || state.kind === "refreshing") {
    return "loading" as const
  }
  return null
}

function normalizeInquiryAnswer(value: string): string | null {
  const answer = value.trim()
  return answer.length >= 1 && answer.length <= 2000 ? answer : null
}

function reduceAdminInquiryAnswerConvergence(
  state: AdminInquiryAnswerConvergenceState,
  event: AdminInquiryAnswerConvergenceEvent,
): AdminInquiryAnswerConvergenceState {
  if (event.type === "reset") {
    return initialAdminInquiryAnswerConvergenceState
  }

  if (event.type === "begin") {
    return { kind: "refreshing", reason: event.reason }
  }

  if (
    state.kind === "idle" ||
    state.kind === "mutation" ||
    state.kind === "conflict-refreshed"
  ) {
    return state
  }

  if (event.type === "retry") {
    return state.kind === "retry"
      ? { kind: "refreshing", reason: state.reason }
      : state
  }

  if (event.type === "refetch-failed") {
    return { kind: "retry", reason: state.reason }
  }

  if (state.reason === "uncertain") {
    return initialAdminInquiryAnswerConvergenceState
  }

  if (event.inquiryStatus !== "answered") {
    return { kind: "retry", reason: state.reason }
  }

  return state.reason === "conflict"
    ? { kind: "conflict-refreshed" }
    : initialAdminInquiryAnswerConvergenceState
}

function isAdminInquiryAnswerConvergenceLocked(
  state: AdminInquiryAnswerConvergenceState,
) {
  return (
    state.kind === "mutation" ||
    state.kind === "refreshing" ||
    state.kind === "retry"
  )
}

function shouldShowAdminInquiryAnsweredConflict(
  state: AdminInquiryAnswerConvergenceState,
) {
  return state.kind === "conflict-refreshed"
}

function shouldShowAdminInquiryPageConvergence(
  state: AdminInquiryAnswerConvergenceState,
  targetInquiryId: number | null,
  selectedInquiryId: number | null,
  targetIsVisible: boolean,
) {
  return (
    isAdminInquiryAnswerConvergenceLocked(state) &&
    targetInquiryId !== null &&
    (!targetIsVisible || targetInquiryId !== selectedInquiryId)
  )
}

export {
  getAdminInquiryExpandedConvergenceKind,
  initialAdminInquiryAnswerConvergenceState,
  isAdminInquiryAnswerConvergenceLocked,
  normalizeInquiryAnswer,
  reduceAdminInquiryAnswerConvergence,
  shouldShowAdminInquiryAnsweredConflict,
  shouldShowAdminInquiryPageConvergence,
}
export type {
  AdminInquiryAnswerConvergenceReason,
  AdminInquiryAnswerConvergenceState,
  AdminInquiryStatus,
}
