import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { layoutKnowledgeGraph } from "./knowledge-graph-layout.ts"

test("focused node is centered and every graph node receives finite coordinates", () => {
  const graph = layoutKnowledgeGraph({
    nodes: [
      { id: "visa", label: "Visa", degree: 5 },
      { id: "passport", label: "Passport", degree: 3 },
      { id: "deadline", label: "Deadline", degree: 1 },
    ],
    edges: [
      {
        relationId: 1,
        source: "visa",
        target: "passport",
        predicate: "requires",
        confidence: 0.91,
        sourceId: 10,
        evidenceChunkId: 20,
        sourceDisplayName: "FAQ",
        evidencePreview: "Passport is required.",
        createdAt: "2026-07-18T00:00:00Z",
      },
      {
        relationId: 2,
        source: "passport",
        target: "deadline",
        predicate: "has_deadline",
        confidence: 0.72,
        sourceId: 11,
        evidenceChunkId: 21,
        sourceDisplayName: "Guide",
        evidencePreview: "Submit before deadline.",
        createdAt: "2026-07-18T00:00:00Z",
      },
    ],
    focusNodeId: "visa",
    width: 600,
    height: 400,
  })

  const focused = graph.nodes.find((node) => node.id === "visa")

  assert.ok(focused)
  assert.equal(focused.x, 300)
  assert.equal(focused.y, 200)

  for (const node of graph.nodes) {
    assert.equal(Number.isFinite(node.x), true, `${node.id} x must be finite`)
    assert.equal(Number.isFinite(node.y), true, `${node.id} y must be finite`)
  }
})
