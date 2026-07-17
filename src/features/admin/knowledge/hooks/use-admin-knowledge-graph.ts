"use client"

import { useQuery } from "@tanstack/react-query"

import { getAdminKnowledgeGraph } from "@/features/admin/knowledge/api/admin-knowledge-graph-api"
import type { AdminKnowledgeGraphParams } from "@/features/admin/knowledge/api/admin-knowledge-graph-api"

const adminKnowledgeGraphKeys = {
  all: ["admin", "knowledge", "graph"] as const,
  detail: ({ query, focus, predicate, limit }: AdminKnowledgeGraphParams) => [
    ...adminKnowledgeGraphKeys.all,
    { query, focus, predicate, limit },
  ] as const,
}

function useAdminKnowledgeGraph(params: AdminKnowledgeGraphParams) {
  return useQuery({
    queryKey: adminKnowledgeGraphKeys.detail(params),
    queryFn: () => getAdminKnowledgeGraph(params),
  })
}

export { adminKnowledgeGraphKeys, useAdminKnowledgeGraph }
