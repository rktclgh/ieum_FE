import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { discoverStaticAppRoutes } from "./static-export-routes.mjs"

async function createPage(appDirectory, routeDirectory, fileName = "page.tsx") {
  const pageDirectory = path.join(appDirectory, routeDirectory)
  await mkdir(pageDirectory, { recursive: true })
  await writeFile(path.join(pageDirectory, fileName), "export default function Page() {}\n")
}

async function withAppFixture(t) {
  const fixtureDirectory = await mkdtemp(path.join(os.tmpdir(), "ieum-static-routes."))
  t.after(() => rm(fixtureDirectory, { recursive: true, force: true }))

  const appDirectory = path.join(fixtureDirectory, "app")
  await mkdir(appDirectory)
  return appDirectory
}

test("derives root and nested export routes from page files and omits route groups", async (t) => {
  const appDirectory = await withAppFixture(t)
  await Promise.all([
    createPage(appDirectory, ""),
    createPage(appDirectory, "(public)/login"),
    createPage(appDirectory, "(public)/(account)/join/social"),
  ])

  assert.deepEqual(await discoverStaticAppRoutes(appDirectory), [
    "",
    "join/social",
    "login",
  ])
})

test("discovers every default Next page extension", async (t) => {
  const appDirectory = await withAppFixture(t)
  await Promise.all([
    createPage(appDirectory, ""),
    createPage(appDirectory, "javascript", "page.js"),
    createPage(appDirectory, "javascript-jsx", "page.jsx"),
    createPage(appDirectory, "typescript", "page.ts"),
    createPage(appDirectory, "typescript-tsx", "page.tsx"),
  ])

  assert.deepEqual(await discoverStaticAppRoutes(appDirectory), [
    "",
    "javascript",
    "javascript-jsx",
    "typescript",
    "typescript-tsx",
  ])
})

test("rejects an app tree without a root page", async (t) => {
  const appDirectory = await withAppFixture(t)
  await createPage(appDirectory, "login")

  await assert.rejects(
    discoverStaticAppRoutes(appDirectory),
    /missing root page file under app directory:/,
  )
})

test("rejects a dynamic app directory even when it does not contain a page", async (t) => {
  const appDirectory = await withAppFixture(t)
  await mkdir(path.join(appDirectory, "users/[userId]"), { recursive: true })

  await assert.rejects(
    discoverStaticAppRoutes(appDirectory),
    /runtime dynamic app directory remains: .*\[userId\]/,
  )
})

test("rejects route-group pages that collapse onto the same export route", async (t) => {
  const appDirectory = await withAppFixture(t)
  await Promise.all([
    createPage(appDirectory, "(first)/login"),
    createPage(appDirectory, "(second)/login"),
  ])

  await assert.rejects(
    discoverStaticAppRoutes(appDirectory),
    /multiple page files map to static export route: login/,
  )
})

test("ignores private App Router folders", async (t) => {
  const appDirectory = await withAppFixture(t)
  await Promise.all([
    createPage(appDirectory, ""),
    createPage(appDirectory, "login"),
    createPage(appDirectory, "_components/preview"),
  ])

  assert.deepEqual(await discoverStaticAppRoutes(appDirectory), ["", "login"])
})

test("rejects unsupported parallel and intercepting route directories", async (t) => {
  const parallelAppDirectory = await withAppFixture(t)
  await mkdir(path.join(parallelAppDirectory, "@modal"), { recursive: true })

  await assert.rejects(
    discoverStaticAppRoutes(parallelAppDirectory),
    /unsupported parallel route directory: .*@modal/,
  )

  const interceptingAppDirectory = await withAppFixture(t)
  await mkdir(path.join(interceptingAppDirectory, "(..)photo"), {
    recursive: true,
  })

  await assert.rejects(
    discoverStaticAppRoutes(interceptingAppDirectory),
    /unsupported intercepting route directory: .*\(\.\.\)photo/,
  )
})
