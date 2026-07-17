"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"

import {
  approveAdminKnowledgeCandidate,
  getAdminKnowledgeCandidate,
  getAdminKnowledgeCandidates,
  rejectAdminKnowledgeCandidate,
} from "@/features/admin/knowledge/api/admin-knowledge-candidates-api"
import type {
  AdminKnowledgeCandidatesParams,
  ApproveKnowledgeCandidateRequest,
  RejectKnowledgeCandidateRequest,
} from "@/features/admin/knowledge/api/admin-knowledge-candidates-api"

const adminKnowledgeCandidateKeys = {
  all: ["admin", "knowledge", "relation-candidates"] as const,
  lists: () => [...adminKnowledgeCandidateKeys.all, "list"] as const,
  list: ({ status, size }: Omit<AdminKnowledgeCandidatesParams, "cursor">) => [
    ...adminKnowledgeCandidateKeys.lists(),
    { status, size },
  ] as const,
  detail: (candidateId: number) =>
    [...adminKnowledgeCandidateKeys.all, "detail", candidateId] as const,
}

function invalidateAdminKnowledgeCandidateQueries(
  queryClient: QueryClient,
  candidateId: number,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: adminKnowledgeCandidateKeys.lists() }),
    queryClient.invalidateQueries({
      queryKey: adminKnowledgeCandidateKeys.detail(candidateId),
      exact: true,
      refetchType: "none",
    }),
  ])
}

function useAdminKnowledgeCandidates({
  status,
  size,
}: Omit<AdminKnowledgeCandidatesParams, "cursor">) {
  return useInfiniteQuery({
    queryKey: adminKnowledgeCandidateKeys.list({ status, size }),
    queryFn: ({ pageParam }) =>
      getAdminKnowledgeCandidates({ status, cursor: pageParam, size }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

function useAdminKnowledgeCandidateDetail(candidateId: number) {
  return useQuery({
    queryKey: adminKnowledgeCandidateKeys.detail(candidateId),
    queryFn: () => getAdminKnowledgeCandidate(candidateId),
  })
}

function useApproveAdminKnowledgeCandidate(candidateId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ApproveKnowledgeCandidateRequest) =>
      approveAdminKnowledgeCandidate(candidateId, body),
    onSettled: () =>
      invalidateAdminKnowledgeCandidateQueries(queryClient, candidateId),
  })
}

function useRejectAdminKnowledgeCandidate(candidateId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: RejectKnowledgeCandidateRequest) =>
      rejectAdminKnowledgeCandidate(candidateId, body),
    onSettled: () =>
      invalidateAdminKnowledgeCandidateQueries(queryClient, candidateId),
  })
}

export {
  adminKnowledgeCandidateKeys,
  useAdminKnowledgeCandidateDetail,
  useAdminKnowledgeCandidates,
  useApproveAdminKnowledgeCandidate,
  useRejectAdminKnowledgeCandidate,
}
