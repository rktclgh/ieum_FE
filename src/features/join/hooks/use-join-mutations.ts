import { useMutation } from "@tanstack/react-query"

import {
  checkEmailDuplicate,
  checkNicknameDuplicate,
  sendEmailVerificationCode,
  signup,
  verifyEmailVerificationCode,
} from "@/features/join/api/auth-api"

function useCheckEmailDuplicate() {
  return useMutation({ mutationFn: checkEmailDuplicate })
}

function useSendEmailVerificationCode() {
  return useMutation({ mutationFn: sendEmailVerificationCode })
}

function useVerifyEmailVerificationCode() {
  return useMutation({ mutationFn: verifyEmailVerificationCode })
}

function useCheckNicknameDuplicate() {
  return useMutation({ mutationFn: checkNicknameDuplicate })
}

function useSignup() {
  return useMutation({ mutationFn: signup })
}

export {
  useCheckEmailDuplicate,
  useSendEmailVerificationCode,
  useVerifyEmailVerificationCode,
  useCheckNicknameDuplicate,
  useSignup,
}
