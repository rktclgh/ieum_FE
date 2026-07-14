#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "static export verification failed: $*" >&2
  exit 1
}

assert_file() {
  local path=$1
  [[ -s "$path" ]] || fail "missing or empty file: $path"
}

assert_absent() {
  local path=$1
  [[ ! -e "$path" ]] || fail "forbidden source remains: $path"
}

assert_absent src/proxy.ts
assert_absent src/features/session/api/session-server-api.ts
assert_absent src/lib/api/config.ts

dynamic_directory=$(find src/app -type d -name '[[]*[]]' -print -quit)
[[ -z "$dynamic_directory" ]] || fail "runtime dynamic app directory remains: $dynamic_directory"

route_handler=$(find src/app -type f \( \
  -name 'route.js' -o \
  -name 'route.jsx' -o \
  -name 'route.ts' -o \
  -name 'route.tsx' -o \
  -name 'route.mjs' -o \
  -name 'route.cjs' \
\) -print -quit)
[[ -z "$route_handler" ]] || fail "route handler remains: $route_handler"

source_includes=(
  --include='*.js'
  --include='*.jsx'
  --include='*.ts'
  --include='*.tsx'
  --include='*.mjs'
  --include='*.cjs'
)

if grep -R -n -E "next/(headers|server)|API_BASE_URL|NEXT_PUBLIC_API_BASE_URL|getMeServer|generateStaticParams|force-dynamic|[\"']use server[\"']|unstable_noStore|export const revalidate" \
  "${source_includes[@]}" src next.config.ts; then
  fail "server-runtime or legacy API origin source remains"
fi

if grep -n -E 'async (headers|rewrites|redirects)\(|headers:|rewrites:|redirects:' next.config.ts; then
  fail "request-time Next config remains"
fi

node scripts/ci/verify-static-export-config.mjs || fail "source config does not match the static export contract"

assert_file out/index.html
assert_file out/index.txt
assert_file out/404.html
assert_file out/manifest.webmanifest
assert_file out/favicon.ico
assert_file out/icons/pwa/icon-192.png
assert_file out/icons/pwa/icon-512.png
assert_file out/icons/pwa/icon-maskable-192.png
assert_file out/icons/pwa/icon-maskable-512.png
assert_file out/icons/pwa/apple-touch-icon.png

routes=(
  chats
  chats/notices
  chats/report
  chats/room
  chats/schedule
  friends
  join
  join/social
  login
  meetups/detail
  my
  my/edit
  my/settings
  oauth/kakao/callback
  questions
  questions/detail
)

for route in "${routes[@]}"; do
  assert_file "out/$route/index.html"
  assert_file "out/$route/index.txt"
done

static_asset=$(find out/_next/static -type f -size +0c -print -quit 2>/dev/null || true)
[[ -n "$static_asset" ]] || fail "missing Next static assets"

local_font=$(find out/_next/static -type f -name '*.woff2' -size +0c -print -quit 2>/dev/null || true)
[[ -n "$local_font" ]] || fail "missing bundled local WOFF2 font"

server_bundle=$(find out -type f -path '*/server/*' -print -quit)
[[ -z "$server_bundle" ]] || fail "server bundle leaked into static output: $server_bundle"

echo "static export source and artifact contract passed"
