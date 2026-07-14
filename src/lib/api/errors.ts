import axios from "axios"

interface ApiFieldError {
  field: string
  message: string
}

interface ApiErrorResponse {
  code: string
  message: string
  fieldErrors?: ApiFieldError[]
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const data = error.response?.data
    if (data?.fieldErrors?.[0]?.message) return data.fieldErrors[0].message
    if (data?.message) return data.message
  }
  return fallback
}

function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError<ApiErrorResponse>(error)) return error.response?.data?.code
  return undefined
}

export { getApiErrorMessage, getApiErrorCode }
export type { ApiErrorResponse, ApiFieldError }
