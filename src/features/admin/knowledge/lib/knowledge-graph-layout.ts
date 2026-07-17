import type {
  AdminKnowledgeGraphEdge,
  AdminKnowledgeGraphNode,
} from "@/features/admin/knowledge/api/admin-knowledge-graph-api"

interface KnowledgeGraphLayoutInput {
  nodes: AdminKnowledgeGraphNode[]
  edges: AdminKnowledgeGraphEdge[]
  focusNodeId: string | null
  width: number
  height: number
}

interface PositionedKnowledgeGraphNode extends AdminKnowledgeGraphNode {
  x: number
  y: number
  ring: 0 | 1 | 2
}

interface KnowledgeGraphLayout {
  nodes: PositionedKnowledgeGraphNode[]
  edges: AdminKnowledgeGraphEdge[]
}

function sortedByDegreeAndLabel(
  left: AdminKnowledgeGraphNode,
  right: AdminKnowledgeGraphNode,
) {
  if (right.degree !== left.degree) return right.degree - left.degree
  const labelOrder = left.label.localeCompare(right.label)
  return labelOrder === 0 ? left.id.localeCompare(right.id) : labelOrder
}

function placeRingNode(
  node: AdminKnowledgeGraphNode,
  index: number,
  total: number,
  radius: number,
  centerX: number,
  centerY: number,
  ring: 1 | 2,
): PositionedKnowledgeGraphNode {
  const angle = total === 1 ? -Math.PI / 2 : -Math.PI / 2 + (index / total) * Math.PI * 2

  return {
    ...node,
    x: Math.round(centerX + Math.cos(angle) * radius),
    y: Math.round(centerY + Math.sin(angle) * radius),
    ring,
  }
}

function layoutKnowledgeGraph({
  nodes,
  edges,
  focusNodeId,
  width,
  height,
}: KnowledgeGraphLayoutInput): KnowledgeGraphLayout {
  const centerX = Math.round(width / 2)
  const centerY = Math.round(height / 2)
  const visibleEdges = edges.slice(0, 80)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const selectedCenter =
    (focusNodeId === null ? null : nodeById.get(focusNodeId)) ??
    [...nodes].sort(sortedByDegreeAndLabel)[0] ??
    null

  if (selectedCenter === null) {
    return { nodes: [], edges: visibleEdges }
  }

  const directIds = new Set<string>()
  for (const edge of visibleEdges) {
    if (edge.source === selectedCenter.id && nodeById.has(edge.target)) {
      directIds.add(edge.target)
    }
    if (edge.target === selectedCenter.id && nodeById.has(edge.source)) {
      directIds.add(edge.source)
    }
  }

  const directNodes = [...directIds]
    .map((id) => nodeById.get(id))
    .filter((node): node is AdminKnowledgeGraphNode => node !== undefined)
    .sort(sortedByDegreeAndLabel)
  const outerNodes = nodes
    .filter((node) => node.id !== selectedCenter.id && !directIds.has(node.id))
    .sort(sortedByDegreeAndLabel)

  const innerRadius = Math.max(96, Math.min(width, height) * 0.24)
  const outerRadius = Math.max(innerRadius + 96, Math.min(width, height) * 0.39)

  return {
    nodes: [
      { ...selectedCenter, x: centerX, y: centerY, ring: 0 },
      ...directNodes.map((node, index) =>
        placeRingNode(node, index, directNodes.length, innerRadius, centerX, centerY, 1),
      ),
      ...outerNodes.map((node, index) =>
        placeRingNode(node, index, outerNodes.length, outerRadius, centerX, centerY, 2),
      ),
    ],
    edges: visibleEdges,
  }
}

export { layoutKnowledgeGraph }
export type {
  KnowledgeGraphLayout,
  KnowledgeGraphLayoutInput,
  PositionedKnowledgeGraphNode,
}
