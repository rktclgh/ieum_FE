const MEETING_ACCESS_ERROR_CODES = new Set(["NOT_MEETING_MEMBER", "KICKED_MEMBER"])

function isMeetingAccessErrorCode(code: string | undefined): boolean {
  return code !== undefined && MEETING_ACCESS_ERROR_CODES.has(code)
}

export { isMeetingAccessErrorCode }
