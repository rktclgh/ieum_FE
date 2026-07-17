import { compactQuery } from "@/features/admin/shared/lib/admin-query"
import type { CursorPage } from "@/features/admin/shared/types/admin-types"
import { apiClient } from "@/lib/api/client"

const KNOWLEDGE_RELATION_PREDICATES = [
  "located_in",
  "used_for",
  "requires",
  "applies_to",
  "supports",
  "depends_on",
  "has_deadline",
] as const

type KnowledgeCandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "invalidated"
type KnowledgeRelationPredicate = (typeof KNOWLEDGE_RELATION_PREDICATES)[number]

interface AdminKnowledgeSourceSummary {
  sourceId: number
  sourceType: string
  title: string | null
  canonicalUrl: string | null
  active: boolean
  status: string
}

interface AdminKnowledgeSourceEligibility {
  eligible: boolean
  reason: string | null
}

interface AdminKnowledgeSameSourceRelation {
  relationId: number
  subject: string
  predicate: KnowledgeRelationPredicate | string
  object: string
  evidenceChunkId: number | null
}

interface AdminKnowledgeCandidateItem {
  candidateId: number
  version: number
  status: KnowledgeCandidateStatus
  sourceId: number
  chunkId: number
  subject: string
  predicate: KnowledgeRelationPredicate
  object: string
  evidenceText: string
  confidence: number | null
  createdAt: string
  updatedAt: string
}

interface AdminKnowledgeCandidateDetailResponse extends AdminKnowledgeCandidateItem {
  source: AdminKnowledgeSourceSummary
  sourceEligibility: AdminKnowledgeSourceEligibility
  sameSourceRelations: AdminKnowledgeSameSourceRelation[]
  rejectionReason: string | null
  resolvedAt: string | null
}

interface AdminKnowledgeCandidatesParams {
  status?: KnowledgeCandidateStatus | ""
  cursor?: string | null
  size: number
}

interface ApproveKnowledgeCandidateRequest {
  version: number
  subject: string
  predicate: KnowledgeRelationPredicate
  object: string
}

interface RejectKnowledgeCandidateRequest {
  version: number
  reason?: string
}

async function getAdminKnowledgeCandidates(
  params: AdminKnowledgeCandidatesParams,
): Promise<CursorPage<AdminKnowledgeCandidateItem>> {
  const { data } = await apiClient.get<CursorPage<AdminKnowledgeCandidateItem>>(
    "/api/v1/admin/knowledge/relation-candidates",
    {
      params: compactQuery({
        status: params.status,
        cursor: params.cursor,
        size: params.size,
      }),
    },
  )
  return data
}

async function getAdminKnowledgeCandidate(
  candidateId: number,
): Promise<AdminKnowledgeCandidateDetailResponse> {
  const { data } = await apiClient.get<AdminKnowledgeCandidateDetailResponse>(
    `/api/v1/admin/knowledge/relation-candidates/${candidateId}`,
  )
  return data
}

async function approveAdminKnowledgeCandidate(
  candidateId: number,
  body: ApproveKnowledgeCandidateRequest,
): Promise<void> {
  await apiClient.post(
    `/api/v1/admin/knowledge/relation-candidates/${candidateId}/approve`,
    body,
  )
}

async function rejectAdminKnowledgeCandidate(
  candidateId: number,
  body: RejectKnowledgeCandidateRequest,
): Promise<void> {
  await apiClient.post(
    `/api/v1/admin/knowledge/relation-candidates/${candidateId}/reject`,
    body,
  )
}

export {
  KNOWLEDGE_RELATION_PREDICATES,
  approveAdminKnowledgeCandidate,
  getAdminKnowledgeCandidate,
  getAdminKnowledgeCandidates,
  rejectAdminKnowledgeCandidate,
}
export type {
  AdminKnowledgeCandidateDetailResponse,
  AdminKnowledgeCandidateItem,
  AdminKnowledgeCandidatesParams,
  AdminKnowledgeSameSourceRelation,
  AdminKnowledgeSourceEligibility,
  AdminKnowledgeSourceSummary,
  ApproveKnowledgeCandidateRequest,
  KnowledgeCandidateStatus,
  KnowledgeRelationPredicate,
  RejectKnowledgeCandidateRequest,
}
