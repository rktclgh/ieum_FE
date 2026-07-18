"use client"

import {
  Filter,
  Network,
  RotateCcw,
  Search,
  ZoomIn,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  KNOWLEDGE_RELATION_PREDICATES,
} from "@/features/admin/knowledge/api/admin-knowledge-candidates-api"
import type {
  AdminKnowledgeGraphEdge,
  AdminKnowledgeGraphNode,
} from "@/features/admin/knowledge/api/admin-knowledge-graph-api"
import { useAdminKnowledgeGraph } from "@/features/admin/knowledge/hooks/use-admin-knowledge-graph"
import { layoutKnowledgeGraph } from "@/features/admin/knowledge/lib/knowledge-graph-layout"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useTranslation } from "@/lib/i18n/use-translation"

const GRAPH_WIDTH = 760
const GRAPH_HEIGHT = 560
const GRAPH_LIMIT = 80

function normalizeFilter(value: string) {
  const normalized = value.trim()
  return normalized.length === 0 ? undefined : normalized
}

function formatConfidence(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`
}

function GraphStatus({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 p-8 text-center">
      {children}
    </div>
  )
}

function InspectorField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1 border-b border-gray-100 py-3 last:border-b-0">
      <dt className="text-body-medium-12 text-gray-500">{label}</dt>
      <dd className="break-words text-body-regular-14 text-gray-900">{value}</dd>
    </div>
  )
}

function edgeKey(edge: AdminKnowledgeGraphEdge) {
  return String(edge.relationId)
}

function nodeRadius(node: AdminKnowledgeGraphNode, isFocused: boolean) {
  if (isFocused) return 30
  return Math.max(18, Math.min(26, 16 + node.degree * 1.5))
}

function isActivationKey(event: React.KeyboardEvent) {
  return event.key === "Enter" || event.key === " "
}

type FocusedGraphItem =
  | { kind: "edge"; id: number }
  | { kind: "node"; id: string }
  | null

function AdminKnowledgeGraphPage() {
  const { language, messages } = useTranslation()
  const graphCanvasTitleId = React.useId()
  const [query, setQuery] = React.useState("")
  const [predicate, setPredicate] = React.useState("")
  const [focus, setFocus] = React.useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<number | null>(null)
  const [focusedGraphItem, setFocusedGraphItem] = React.useState<FocusedGraphItem>(null)
  const [zoom, setZoom] = React.useState(1)
  const debouncedQuery = useDebouncedValue(query, 300)
  const graphQuery = useAdminKnowledgeGraph({
    query: normalizeFilter(debouncedQuery),
    focus: focus ?? undefined,
    predicate: normalizeFilter(predicate),
    limit: GRAPH_LIMIT,
  })
  const graph = graphQuery.data
  const selectedEdge =
    graph?.edges.find((edge) => edge.relationId === selectedEdgeId) ?? null
  const layout = React.useMemo(
    () =>
      layoutKnowledgeGraph({
        nodes: graph?.nodes ?? [],
        edges: graph?.edges ?? [],
        focusNodeId: focus,
        width: GRAPH_WIDTH,
        height: GRAPH_HEIGHT,
      }),
    [focus, graph?.edges, graph?.nodes],
  )
  const nodeById = React.useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node])),
    [layout.nodes],
  )
  const selectedEdgeKey = selectedEdge === null ? null : edgeKey(selectedEdge)
  const highlightedNodeIds = React.useMemo(() => {
    const ids = new Set<string>()
    if (focus !== null) ids.add(focus)
    if (selectedEdge !== null) {
      ids.add(selectedEdge.source)
      ids.add(selectedEdge.target)
    }
    return ids
  }, [focus, selectedEdge])
  const dateFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(language, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }),
    [language],
  )
  const isEmpty = !graphQuery.isPending && !graphQuery.isError && layout.nodes.length === 0
  const isGraphBlocked = graphQuery.isPending || graphQuery.isError || isEmpty

  return (
    <section aria-labelledby="admin-knowledge-graph-title" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 id="admin-knowledge-graph-title" className="text-title-bold-28 text-gray-900">
            {messages.admin.knowledge.graphTitle}
          </h1>
          <p className="text-body-regular-14 text-gray-600">
            {messages.admin.knowledge.graphDescription}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuery("")
            setPredicate("")
            setFocus(null)
            setSelectedEdgeId(null)
            setZoom(1)
          }}
        >
          <RotateCcw aria-hidden="true" />
          {messages.admin.knowledge.resetFilters}
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <section className="space-y-4 rounded-lg border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2 text-body-medium-14 text-gray-900">
              <Search className="size-4" aria-hidden="true" />
              {messages.admin.knowledge.graphSearch}
            </div>
            <label
              htmlFor="admin-knowledge-graph-query"
              className="block space-y-2 text-body-medium-13 text-gray-700"
            >
              <span>{messages.admin.knowledge.graphQuery}</span>
              <input
                id="admin-knowledge-graph-query"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelectedEdgeId(null)
                }}
                placeholder={messages.admin.knowledge.graphQueryPlaceholder}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <label
              htmlFor="admin-knowledge-graph-predicate"
              className="block space-y-2 text-body-medium-13 text-gray-700"
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="size-4" aria-hidden="true" />
                {messages.admin.knowledge.predicate}
              </span>
              <select
                id="admin-knowledge-graph-predicate"
                value={predicate}
                onChange={(event) => {
                  setPredicate(event.target.value)
                  setSelectedEdgeId(null)
                }}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">{messages.admin.common.all}</option>
                {KNOWLEDGE_RELATION_PREDICATES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-medium-13 text-gray-700">
                <span className="inline-flex items-center gap-2">
                  <ZoomIn className="size-4" aria-hidden="true" />
                  {messages.admin.knowledge.zoom}
                </span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-primary"
                aria-label={messages.admin.knowledge.zoom}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFocus(null)
                setSelectedEdgeId(null)
              }}
              disabled={focus === null}
            >
              <Network aria-hidden="true" />
              {messages.admin.knowledge.showWholeGraph}
            </Button>
          </section>

          <section className="space-y-3 rounded-lg border border-gray-100 bg-white p-4">
            <h2 className="text-body-medium-14 text-gray-900">
              {messages.admin.knowledge.graphContext}
            </h2>
            <dl className="space-y-2 text-body-regular-14">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">{messages.admin.knowledge.focusNode}</dt>
                <dd className="truncate text-gray-900">{focus ?? messages.admin.common.all}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">{messages.admin.knowledge.nodes}</dt>
                <dd className="text-gray-900">{graph?.nodes.length ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">{messages.admin.knowledge.edges}</dt>
                <dd className="text-gray-900">{graph?.edges.length ?? 0}</dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <h2 className="text-title-semibold-18 text-gray-900">
              {messages.admin.knowledge.graphCanvas}
            </h2>
            {graph?.truncated && (
              <p className="text-body-medium-13 text-amber-700">
                {messages.admin.knowledge.truncatedGraph}
              </p>
            )}
          </div>
          <div className="relative h-[620px] overflow-auto bg-gray-50">
            {graphQuery.isPending && (
              <GraphStatus>
                <AdminAsyncState kind="loading" />
              </GraphStatus>
            )}
            {graphQuery.isError && (
              <GraphStatus>
                <AdminAsyncState
                  kind="error"
                  onRetry={() => void graphQuery.refetch()}
                  retryDisabled={graphQuery.isFetching}
                  isRetrying={graphQuery.isFetching}
                />
              </GraphStatus>
            )}
            {isEmpty && (
              <GraphStatus>
                <AdminAsyncState
                  kind="empty"
                  message={messages.admin.knowledge.emptyGraph}
                />
              </GraphStatus>
            )}
            <svg
              role="group"
              aria-labelledby={graphCanvasTitleId}
              aria-hidden={isGraphBlocked}
              viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
              className={`min-h-full w-full min-w-[760px] ${isGraphBlocked ? "pointer-events-none" : ""}`}
            >
              <title id={graphCanvasTitleId}>{messages.admin.knowledge.graphCanvas}</title>
              <g transform={`translate(${GRAPH_WIDTH * (1 - zoom) / 2} ${GRAPH_HEIGHT * (1 - zoom) / 2}) scale(${zoom})`}>
                {layout.edges.map((edge) => {
                  const source = nodeById.get(edge.source)
                  const target = nodeById.get(edge.target)
                  if (source === undefined || target === undefined) return null
                  const isSelected = edgeKey(edge) === selectedEdgeKey
                  const isKeyboardFocused =
                    focusedGraphItem?.kind === "edge" && focusedGraphItem.id === edge.relationId
                  const isRelated =
                    highlightedNodeIds.has(edge.source) || highlightedNodeIds.has(edge.target)

                  return (
                    <g key={edge.relationId}>
                      {isKeyboardFocused && (
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="#2563eb"
                          strokeLinecap="round"
                          strokeWidth={8}
                        />
                      )}
                      <line
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={isSelected ? "#111827" : isRelated ? "#64748b" : "#d1d5db"}
                        strokeWidth={isSelected ? 3 : 1.5}
                      />
                      <a
                        href={`#knowledge-edge-${edge.relationId}`}
                        role="button"
                        tabIndex={isGraphBlocked ? -1 : 0}
                        className="cursor-pointer outline-none"
                        onClick={(event) => {
                          event.preventDefault()
                          if (isGraphBlocked) return
                          setSelectedEdgeId(edge.relationId)
                        }}
                        onFocus={() => setFocusedGraphItem({ kind: "edge", id: edge.relationId })}
                        onBlur={() => setFocusedGraphItem(null)}
                        onKeyDown={(event) => {
                          if (isGraphBlocked) return
                          if (!isActivationKey(event)) return
                          event.preventDefault()
                          setSelectedEdgeId(edge.relationId)
                        }}
                        aria-label={`${edge.predicate}: ${source.label} - ${target.label}`}
                      >
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="transparent"
                          strokeWidth={16}
                        />
                      </a>
                    </g>
                  )
                })}
                {layout.nodes.map((node) => {
                  const isFocused = focus === node.id || node.ring === 0
                  const isHighlighted = highlightedNodeIds.has(node.id) || isFocused
                  const isKeyboardFocused =
                    focusedGraphItem?.kind === "node" && focusedGraphItem.id === node.id
                  const radius = nodeRadius(node, isFocused)

                  return (
                    <g key={node.id}>
                      <a
                        href={`#knowledge-node-${encodeURIComponent(node.id)}`}
                        role="button"
                        tabIndex={isGraphBlocked ? -1 : 0}
                        className="cursor-pointer outline-none"
                        onClick={(event) => {
                          event.preventDefault()
                          if (isGraphBlocked) return
                          setFocus(node.id)
                          setSelectedEdgeId(null)
                        }}
                        onFocus={() => setFocusedGraphItem({ kind: "node", id: node.id })}
                        onBlur={() => setFocusedGraphItem(null)}
                        onKeyDown={(event) => {
                          if (isGraphBlocked) return
                          if (!isActivationKey(event)) return
                          event.preventDefault()
                          setFocus(node.id)
                          setSelectedEdgeId(null)
                        }}
                        aria-label={`${messages.admin.knowledge.focusNode}: ${node.label}`}
                      >
                        {isKeyboardFocused && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius + 6}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth={4}
                          />
                        )}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius}
                          fill={isHighlighted ? "#111827" : "#ffffff"}
                          stroke={isHighlighted ? "#111827" : "#cbd5e1"}
                          strokeWidth={2}
                        />
                      </a>
                      <text
                        x={node.x}
                        y={node.y + radius + 16}
                        textAnchor="middle"
                        className="pointer-events-none fill-gray-900 text-[12px] font-medium"
                      >
                        {node.label.length > 16 ? `${node.label.slice(0, 15)}...` : node.label}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        className={`pointer-events-none text-[11px] font-semibold ${isHighlighted ? "fill-white" : "fill-gray-600"}`}
                      >
                        {node.degree}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>
        </section>

        <aside className="rounded-lg border border-gray-100 bg-white p-4">
          <h2 className="text-title-semibold-18 text-gray-900">
            {messages.admin.knowledge.inspector}
          </h2>
          {selectedEdge === null ? (
            <p className="mt-4 text-body-regular-14 text-gray-600">
              {messages.admin.knowledge.selectEdgeHint}
            </p>
          ) : (
            <dl className="mt-3">
              <InspectorField label="ID" value={selectedEdge.relationId} />
              <InspectorField label={messages.admin.knowledge.predicate} value={selectedEdge.predicate} />
              <InspectorField label={messages.admin.knowledge.confidence} value={formatConfidence(selectedEdge.confidence)} />
              <InspectorField
                label={messages.admin.knowledge.source}
                value={`#${selectedEdge.sourceId} · ${selectedEdge.sourceDisplayName}`}
              />
              <InspectorField
                label={messages.admin.knowledge.chunk}
                value={selectedEdge.evidenceChunkId ?? "—"}
              />
              <InspectorField
                label={messages.admin.knowledge.evidence}
                value={selectedEdge.evidencePreview}
              />
              <InspectorField
                label={messages.admin.knowledge.createdAt}
                value={dateFormatter.format(new Date(selectedEdge.createdAt))}
              />
            </dl>
          )}
        </aside>
      </div>
    </section>
  )
}

export { AdminKnowledgeGraphPage }
