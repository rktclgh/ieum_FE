import { apiClient } from "@/lib/api/client"
import type { UserRole } from "@/features/session/types/user-role"

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  userId: number
  role: UserRole
  passwordResetRequired: boolean
}

async function login(request: LoginRequest) {
  const { data } = await apiClient.post<LoginResponse>("/api/v1/auth/login", request)
  return data
}

export { login }
export type { LoginRequest, LoginResponse }
