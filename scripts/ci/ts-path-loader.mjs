import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const sourceRoot = path.resolve(fileURLToPath(new URL("../../src", import.meta.url)))

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context)
  }

  const sourcePath = path.join(sourceRoot, specifier.slice(2))
  const extension = existsSync(`${sourcePath}.ts`)
    ? ".ts"
    : existsSync(`${sourcePath}.tsx`)
      ? ".tsx"
      : ""
  return nextResolve(pathToFileURL(`${sourcePath}${extension}`).href, context)
}
