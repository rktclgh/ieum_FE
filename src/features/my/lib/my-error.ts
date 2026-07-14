import { getApiErrorCode } from "@/lib/api/errors"
import type { Messages } from "@/lib/i18n/messages"

// 내 정보/설정 API 에러 code를 i18n 메시지로 변환한다. 매핑에 없는 code는 default로 폴백.
function getMyErrorMessage(error: unknown, messages: Messages): string {
  const code = getApiErrorCode(error)
  const errors = messages.my.errors
  if (code && Object.prototype.hasOwnProperty.call(errors, code)) {
    return errors[code as keyof typeof errors]
  }
  return errors.default
}

export { getMyErrorMessage }
