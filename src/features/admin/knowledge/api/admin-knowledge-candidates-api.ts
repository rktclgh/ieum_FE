import { compactQuery } from "@/features/admin/shared/lib/admin-query"
import type { CursorPage } from "@/features/admin/shared/types/admin-types"
import { apiClient } from "@/lib/api/client"

const KNOWLEDGE_RELATION_PREDICATES = [
  "requires",
  "applies_to",
  "located_in",
  "exception_of",
  "prevents",
  "supports",
  "has_deadline",
  "depends_on",
  "reported_to",
  "used_for",
] as const

type KnowledgeCandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "invalidated"
type KnowledgeRelationPredicate = (typeof KNOWLEDGE_RELATION_PREDICATES)[number]

interface AdminKnowledgeSourceSummary {
  questionId: number
  answerId: number
  displayName: string
  status: string
  active: boolean
  validUntil: string | null
  eligible: boolean
}

interface AdminKnowledgeSourceDetail extends AdminKnowledgeSourceSummary {
  questionTitle: string
  questionContent: string
  answerContent: string
  chunkContent: string
}

interface AdminKnowledgeSameSourceRelation {
  relationId: number
  sourceId: number
  subject: string
  predicate: KnowledgeRelationPredicate | string
  object: string
  confidence: number | null
  evidenceChunkId: number | null
}

interface AdminKnowledgeCandidateItem {
  candidateId: number
  version: number
  status: KnowledgeCandidateStatus
  sourceId: number
  evidenceChunkId: number
  subject: string
  predicate: KnowledgeRelationPredicate
  object: string
  confidence: number | null
  evidenceExcerpt: string
  reviewerUserId: number | null
  reviewedAt: string | null
  reviewNote: string | null
  promotionRelationId: number | null
  createdAt: string
  updatedAt: string
  source: AdminKnowledgeSourceSummary
}

interface AdminKnowledgeCandidateDetailResponse extends AdminKnowledgeCandidateItem {
  extractionProvider: string | null
  extractionModel: string | null
  source: AdminKnowledgeSourceDetail
  sameSourceRelations: AdminKnowledgeSameSourceRelation[]
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

interface AdminKnowledgeCandidateDecisionResponse {
  candidateId: number
  status: KnowledgeCandidateStatus
  version: number
  relation: AdminKnowledgeSameSourceRelation | null
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
): Promise<AdminKnowledgeCandidateDecisionResponse> {
  const { data } = await apiClient.post<AdminKnowledgeCandidateDecisionResponse>(
    `/api/v1/admin/knowledge/relation-candidates/${candidateId}/approve`,
    body,
  )
  return data
}

async function rejectAdminKnowledgeCandidate(
  candidateId: number,
  body: RejectKnowledgeCandidateRequest,
): Promise<AdminKnowledgeCandidateDecisionResponse> {
  const { data } = await apiClient.post<AdminKnowledgeCandidateDecisionResponse>(
    `/api/v1/admin/knowledge/relation-candidates/${candidateId}/reject`,
    body,
  )
  return data
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
  AdminKnowledgeCandidateDecisionResponse,
  AdminKnowledgeCandidateItem,
  AdminKnowledgeCandidatesParams,
  AdminKnowledgeSameSourceRelation,
  AdminKnowledgeSourceDetail,
  AdminKnowledgeSourceSummary,
  ApproveKnowledgeCandidateRequest,
  KnowledgeCandidateStatus,
  KnowledgeRelationPredicate,
  RejectKnowledgeCandidateRequest,
}
