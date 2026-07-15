type AdminQueryValue = string | number | boolean | null | undefined

function compactQuery(values: Record<string, AdminQueryValue>): URLSearchParams {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue
    query.append(key, String(value))
  }

  return query
}

export { compactQuery }
export type { AdminQueryValue }
