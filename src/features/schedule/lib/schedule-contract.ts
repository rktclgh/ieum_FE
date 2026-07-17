function requireScheduleIdentifier(value: number, field: string): string {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`)
  }

  return String(value)
}

function meetingSchedulePath(meetingId: number, scheduleId?: number): string {
  const collectionPath = `/api/v1/meetings/${requireScheduleIdentifier(meetingId, "meetingId")}/schedules`
  return scheduleId === undefined
    ? collectionPath
    : `${collectionPath}/${requireScheduleIdentifier(scheduleId, "scheduleId")}`
}

function scheduleReportPath(meetingId: number, scheduleId: number): string {
  return `${meetingSchedulePath(meetingId, scheduleId)}/report`
}

export { meetingSchedulePath, scheduleReportPath }
