type UserStatus = "active" | "suspended"
type SanctionType = "temporary" | "permanent"
type ReportReason = "spam" | "ad" | "abuse" | "obscene" | "harassment" | "etc"
type ReportStatus = "pending" | "ai_reviewed" | "confirmed" | "dismissed"
type ReportAiReviewState =
  | "pending"
  | "processing"
  | "retry"
  | "completed"
  | "cancelled"
  | "dead"
type AdminReportDecision = "suspend" | "hold" | "normal"

interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
}

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type {
  AdminReportDecision,
  CursorPage,
  JsonPrimitive,
  JsonValue,
  ReportAiReviewState,
  ReportReason,
  ReportStatus,
  SanctionType,
  UserStatus,
}
