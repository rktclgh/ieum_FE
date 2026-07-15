import type { ReportStatus } from "@/features/admin/shared/types/admin-types"

type AdminReportDecisionConvergenceReason = "success" | "conflict" | "uncertain"

type AdminReportDecisionConvergenceState =
  | { kind: "idle" }
  | { kind: "refreshing"; reason: AdminReportDecisionConvergenceReason }
  | { kind: "retry"; reason: AdminReportDecisionConvergenceReason }
  | { kind: "conflict-refreshed" }

type AdminReportDecisionConvergenceEvent =
  | { type: "reset" }
  | { type: "begin"; reason: AdminReportDecisionConvergenceReason }
  | { type: "retry" }
  | { type: "refetch-failed" }
  | { type: "refetch-succeeded"; reportStatus: ReportStatus }

const initialAdminReportDecisionConvergenceState = { kind: "idle" } as const

function reduceAdminReportDecisionConvergence(
  state: AdminReportDecisionConvergenceState,
  event: AdminReportDecisionConvergenceEvent,
): AdminReportDecisionConvergenceState {
  if (event.type === "reset") {
    return initialAdminReportDecisionConvergenceState
  }

  if (event.type === "begin") {
    return { kind: "refreshing", reason: event.reason }
  }

  if (state.kind === "idle" || state.kind === "conflict-refreshed") {
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

  if (state.reason === "conflict") {
    return { kind: "conflict-refreshed" }
  }

  if (state.reason === "uncertain") {
    return initialAdminReportDecisionConvergenceState
  }

  if (
    event.reportStatus === "confirmed" ||
    event.reportStatus === "dismissed"
  ) {
    return initialAdminReportDecisionConvergenceState
  }

  return { kind: "retry", reason: state.reason }
}

function isAdminReportDecisionConvergenceLocked(
  state: AdminReportDecisionConvergenceState,
) {
  return state.kind === "refreshing" || state.kind === "retry"
}

function shouldShowAdminReportResolvedConflict(
  state: AdminReportDecisionConvergenceState,
) {
  return state.kind === "conflict-refreshed"
}

export {
  initialAdminReportDecisionConvergenceState,
  isAdminReportDecisionConvergenceLocked,
  reduceAdminReportDecisionConvergence,
  shouldShowAdminReportResolvedConflict,
}
export type {
  AdminReportDecisionConvergenceReason,
  AdminReportDecisionConvergenceState,
}
