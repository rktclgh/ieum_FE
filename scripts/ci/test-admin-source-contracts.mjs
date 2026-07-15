import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const appRoot = path.join(repoRoot, "src/app")

function source(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : ""
}

function dynamicDirectories(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return []

    const entryPath = path.join(directory, entry.name)
    const current = /\[[^\]]+\]/.test(entry.name)
      ? [path.relative(appRoot, entryPath)]
      : []

    return [...current, ...dynamicDirectories(entryPath)]
  })
}

test("the static app router contains no runtime dynamic directory", () => {
  assert.deepEqual(dynamicDirectories(appRoot), [])
})

test("dynamic directory detection includes interception-prefixed bracket segments", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ieum-admin-routes-"))
  const dynamicNames = ["(.)[id]", "(..)[...slug]"]

  try {
    for (const name of dynamicNames) {
      fs.mkdirSync(path.join(fixtureRoot, name))
    }

    assert.deepEqual(
      dynamicDirectories(fixtureRoot).map((directory) => path.basename(directory)).sort(),
      dynamicNames.sort(),
    )
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true })
  }
})

test("session and login APIs consume the neutral canonical UserRole", () => {
  const sessionApi = source("src/features/session/api/session-api.ts")
  const authApi = source("src/features/login/api/auth-api.ts")
  const roleImport = /import type \{ UserRole \} from ["']@\/features\/session\/types\/user-role["']/

  assert.match(sessionApi, roleImport)
  assert.match(sessionApi, /interface UserMeResponse \{[\s\S]*?\n\s+role: UserRole\n/)
  assert.doesNotMatch(sessionApi, /\brole\?:\s*UserRole/)
  assert.match(authApi, roleImport)
  assert.match(authApi, /interface LoginResponse \{[\s\S]*?\n\s+role: UserRole\n/)
  assert.doesNotMatch(authApi, /\brole:\s*string/)
})

test("all seven locale objects wire the shared admin message dictionaries", () => {
  const localeContracts = {
    ko: "adminKo",
    en: "adminEn",
    ja: "adminEn",
    zh: "adminEn",
    vi: "adminEn",
    th: "adminEn",
    ru: "adminEn",
  }

  for (const [locale, dictionary] of Object.entries(localeContracts)) {
    const localeSource = source(`src/lib/i18n/messages/${locale}.ts`)
    assert.match(
      localeSource,
      new RegExp(`import \\{ ${dictionary} \\} from ["']\\./admin["']`),
      `${locale}.ts must import ${dictionary}`,
    )
    assert.match(
      localeSource,
      new RegExp(`\\n\\s+admin: ${dictionary},`),
      `${locale}.ts must expose admin: ${dictionary}`,
    )
  }
})
