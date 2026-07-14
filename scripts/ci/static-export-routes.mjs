import { readdir } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

const dynamicSegmentPattern = /^\[.*\]$/
const routeGroupPattern = /^\(.*\)$/
const interceptingRoutePattern = /^\(\.{1,3}\)/
const pageFileNames = new Set(["page.js", "page.jsx", "page.ts", "page.tsx"])

async function discoverStaticAppRoutes(appDirectory) {
  const routeOwners = new Map()

  async function visit(directory, sourceSegments) {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"))

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        if (entry.name.startsWith("_")) continue

        if (entry.name.startsWith("@")) {
          throw new Error(`unsupported parallel route directory: ${entryPath}`)
        }

        if (interceptingRoutePattern.test(entry.name)) {
          throw new Error(`unsupported intercepting route directory: ${entryPath}`)
        }

        if (dynamicSegmentPattern.test(entry.name)) {
          throw new Error(`runtime dynamic app directory remains: ${entryPath}`)
        }

        await visit(entryPath, [...sourceSegments, entry.name])
        continue
      }

      if (!entry.isFile() || !pageFileNames.has(entry.name)) continue

      const route = sourceSegments
        .filter((segment) => !routeGroupPattern.test(segment))
        .join("/")
      const existingPage = routeOwners.get(route)

      if (existingPage) {
        throw new Error(
          `multiple page files map to static export route: ${route || "/"} (${existingPage}, ${entryPath})`,
        )
      }

      routeOwners.set(route, entryPath)
    }
  }

  await visit(appDirectory, [])

  if (routeOwners.size === 0) {
    throw new Error(`no page files found under app directory: ${appDirectory}`)
  }
  if (!routeOwners.has("")) {
    throw new Error(`missing root page file under app directory: ${appDirectory}`)
  }

  return [...routeOwners.keys()].sort((left, right) => left.localeCompare(right, "en"))
}

export { discoverStaticAppRoutes }

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  discoverStaticAppRoutes(process.argv[2] ?? "src/app")
    .then((routes) => process.stdout.write(`${routes.join("\n")}\n`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
