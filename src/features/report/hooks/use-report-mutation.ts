"use client"

import { useMutation } from "@tanstack/react-query"

import { submitReport } from "@/features/report/api/report-api"

function useSubmitReport() {
  return useMutation({
    mutationFn: submitReport,
  })
}

export { useSubmitReport }
