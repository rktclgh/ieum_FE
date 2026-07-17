import { compactQuery } from "@/features/admin/shared/lib/admin-query"
import { apiClient } from "@/lib/api/client"

interface AdminKnowledgeGraphNode {
  id: string
  label: string
  degree: number
}

interface AdminKnowledgeGraphEdge {
  relationId: number
  source: string
  target: string
  predicate: string
  confidence: number | null
  sourceId: number
  evidenceChunkId: number | null
  sourceDisplayName: string
  evidencePreview: string
  createdAt: string
}

interface AdminKnowledgeGraphResponse {
  nodes: AdminKnowledgeGraphNode[]
  edges: AdminKnowledgeGraphEdge[]
  truncated: boolean
}

interface AdminKnowledgeGraphParams {
  query?: string
  focus?: string
  predicate?: string
  limit: number
}

async function getAdminKnowledgeGraph(
  params: AdminKnowledgeGraphParams,
): Promise<AdminKnowledgeGraphResponse> {
  const { data } = await apiClient.get<AdminKnowledgeGraphResponse>(
    "/api/v1/admin/knowledge/graph",
    {
      params: compactQuery({
        query: params.query,
        focus: params.focus,
        predicate: params.predicate,
        limit: params.limit,
      }),
    },
  )
  return data
}

export { getAdminKnowledgeGraph }
export type {
  AdminKnowledgeGraphEdge,
  AdminKnowledgeGraphNode,
  AdminKnowledgeGraphParams,
  AdminKnowledgeGraphResponse,
}
