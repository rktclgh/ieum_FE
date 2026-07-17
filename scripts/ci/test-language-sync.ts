import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

function compactSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8").replace(/\s+/g, "")
}

test("query provider syncs authenticated server language into i18n state", () => {
  const provider = compactSource("src/lib/query/query-provider.tsx")

  assert.match(
    provider,
    /functionLanguageSessionSync\(\)\{const\{data:user\}=useMe\(\);/,
  )
  assert.match(
    provider,
    /constserverLanguage=user\?\.settings\.language;/,
  )
  assert.match(
    provider,
    /if\(!serverLanguage\)return;setLanguage\(serverLanguage\)/,
  )
  assert.match(provider, /<LanguageSessionSync\/><WebPushSessionReconciler\/>/)
})

test("settings form keeps i18n language aligned with server success and rollback", () => {
  const hook = compactSource("src/features/my/hooks/use-settings-form.ts")

  assert.match(hook, /onSuccess:\(nextSettings\)=>\{/)
  assert.match(hook, /setSettings\(nextSettings\)/)
  assert.match(hook, /setSyncedServerSettings\(nextSettings\)/)
  assert.match(hook, /setLanguage\(nextSettings\.language\)/)
  assert.match(hook, /onError:\(\)=>\{/)
  assert.match(hook, /setSettings\(previous\)/)
  assert.match(hook, /setLanguage\(previous\.language\)/)
})

test("language selector blocks a second choice while its settings patch is pending", () => {
  const component = compactSource("src/features/my/components/language-setting-item.tsx")

  assert.match(component, /constform=useSettingsForm\(settings\)/)
  assert.match(component, /disabled=\{form\.isPending\}/)
})
