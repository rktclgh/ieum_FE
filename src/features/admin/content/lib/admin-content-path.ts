import type {
  AdminContentListPath,
  AdminContentType,
} from "@/features/admin/content/api/admin-content-api"

function toAdminContentListPath(type: AdminContentType): AdminContentListPath {
  return type === "question" ? "questions" : "meetings"
}

export { toAdminContentListPath }
