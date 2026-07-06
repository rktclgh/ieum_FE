import { apiClient } from "@/lib/api/client"

interface CheckEmailDuplicateRequest {
  email: string
}

interface CheckNicknameDuplicateRequest {
  nickname: string
}

interface DuplicateCheckResponse {
  available: boolean
}

interface SendEmailVerificationRequest {
  email: string
}

interface SendEmailVerificationResponse {
  expiresInSeconds: number
}

interface VerifyEmailVerificationRequest {
  email: string
  code: string
}

interface VerifyEmailVerificationResponse {
  emailVerificationToken: string
  expiresInSeconds: number
}

interface SignupRequest {
  email: string
  password: string
  nickname: string
  birthDate: string
  gender: "male" | "female" | "other"
  nationality: string
  language: string
  emailVerificationToken: string
}

interface SignupResponse {
  userId: number
}

async function checkEmailDuplicate(request: CheckEmailDuplicateRequest) {
  const { data } = await apiClient.post<DuplicateCheckResponse>(
    "/api/v1/auth/email/check-duplicate",
    request
  )
  return data
}

async function sendEmailVerificationCode(request: SendEmailVerificationRequest) {
  const { data } = await apiClient.post<SendEmailVerificationResponse>(
    "/api/v1/auth/email/send-code",
    request
  )
  return data
}

async function verifyEmailVerificationCode(request: VerifyEmailVerificationRequest) {
  const { data } = await apiClient.post<VerifyEmailVerificationResponse>(
    "/api/v1/auth/email/verify",
    request
  )
  return data
}

async function checkNicknameDuplicate(request: CheckNicknameDuplicateRequest) {
  const { data } = await apiClient.post<DuplicateCheckResponse>(
    "/api/v1/auth/nickname/check-duplicate",
    request
  )
  return data
}

async function signup(request: SignupRequest) {
  const { data } = await apiClient.post<SignupResponse>("/api/v1/auth/signup", request)
  return data
}

export {
  checkEmailDuplicate,
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
  checkNicknameDuplicate,
  signup,
}
export type { SignupRequest, SignupResponse }
