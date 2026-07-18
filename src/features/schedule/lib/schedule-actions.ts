// 일정 편집(수정)은 디자인에서 제외됨(#249) — 메뉴는 신고/삭제만. canEdit은 계약 유지용으로 남기되 사용하지 않는다.
type ScheduleAction = "delete" | "report"

interface ScheduleCapabilities {
  canEdit: boolean
  canDelete: boolean
  canReport: boolean
}

/**
 * The server is the sole authority for schedule actions. Keep this mapping pure
 * so rendering never infers host/member permissions from client-owned state.
 */
function buildScheduleActions({ canDelete, canReport }: ScheduleCapabilities): ScheduleAction[] {
  const actions: ScheduleAction[] = []

  if (canReport) actions.push("report")
  if (canDelete) actions.push("delete")

  return actions
}

export { buildScheduleActions }
export type { ScheduleAction, ScheduleCapabilities }
