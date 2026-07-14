import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/errors"
import type { Messages } from "@/lib/i18n/messages"

// 모임 API 에러 code를 i18n 메시지로 변환한다. 매핑에 없는 code는 default 로 폴백.
// VALIDATION_FAILED 는 서버가 내려준 동적 필드 메시지를 우선 사용한다.
function getMeetupErrorMessage(error: unknown, messages: Messages): string {
  const code = getApiErrorCode(error)
  const errors = messages.meetup.errors

  if (code === "VALIDATION_FAILED") {
    return getApiErrorMessage(error, errors.VALIDATION_FAILED)
  }
  if (code && Object.prototype.hasOwnProperty.call(errors, code)) {
    return errors[code as keyof typeof errors]
  }
  return errors.default
}

export { getMeetupErrorMessage }
