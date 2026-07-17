type ScheduleAction = "edit" | "delete" | "report"

interface ScheduleCapabilities {
  canEdit: boolean
  canDelete: boolean
  canReport: boolean
}

/**
 * The server is the sole authority for schedule actions. Keep this mapping pure
 * so rendering never infers host/member permissions from client-owned state.
 */
function buildScheduleActions({ canEdit, canDelete, canReport }: ScheduleCapabilities): ScheduleAction[] {
  const actions: ScheduleAction[] = []

  if (canEdit) actions.push("edit")
  if (canReport) actions.push("report")
  if (canDelete) actions.push("delete")

  return actions
}

export { buildScheduleActions }
export type { ScheduleAction, ScheduleCapabilities }
