import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(currentDirectory, "../..")
const nextConfigPath = path.join(repoRoot, "next.config.ts")
const source = fs.readFileSync(nextConfigPath, "utf8")
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: nextConfigPath,
  reportDiagnostics: true,
})

const errors = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
)
assert.equal(errors.length, 0, "next.config.ts must transpile without syntax errors")

const configModule = { exports: {} }
const evaluateConfig = new Function(
  "exports",
  "module",
  "require",
  "__filename",
  "__dirname",
  transpiled.outputText,
)
evaluateConfig(
  configModule.exports,
  configModule,
  createRequire(nextConfigPath),
  nextConfigPath,
  repoRoot,
)

assert.deepEqual(configModule.exports.default, {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
})

const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
)
const scripts = packageJson.scripts ?? {}
const expectedScripts = {
  typecheck: "next typegen && tsc --noEmit --incremental false",
  "test:contracts": "bash scripts/ci/test-client-contracts.sh",
  "check:layout": "bash scripts/ci/check-layout-contract.sh",
  "verify:out": "bash scripts/ci/verify-static-export.sh",
  verify:
    "pnpm check:layout && pnpm test:contracts && pnpm lint && pnpm typecheck && pnpm build && pnpm verify:out",
}

assert.equal(Object.hasOwn(scripts, "start"), false, "the Next start script must be absent")
for (const command of Object.values(scripts)) {
  assert.doesNotMatch(command, /(^|\s)next\s+start(\s|$)/)
}
for (const [name, command] of Object.entries(expectedScripts)) {
  assert.equal(scripts[name], command, `unexpected package script: ${name}`)
}
