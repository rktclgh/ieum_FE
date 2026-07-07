"use client"

import { useMutation } from "@tanstack/react-query"

import {
  completeSocialSignup,
  startSocial,
} from "@/features/social-login/api/social-api"

function useStartSocial() {
  return useMutation({ mutationFn: startSocial })
}

function useCompleteSocialSignup() {
  return useMutation({ mutationFn: completeSocialSignup })
}

export { useCompleteSocialSignup, useStartSocial }
