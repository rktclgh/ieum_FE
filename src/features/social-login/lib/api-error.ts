import axios from "axios"

function getApiCode(error: unknown) {
  if (!axios.isAxiosError<{ code?: string }>(error)) return undefined
  return error.response?.data?.code
}

export { getApiCode }
