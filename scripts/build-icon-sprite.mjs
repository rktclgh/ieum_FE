// 앱 전역 아이콘용 SVG 스프라이트를 굽는다.
//
// public/icons/**(flag/, pwa/ 제외) 아래 개별 SVG 79개를 각 컴포넌트가 next/image로 그린다.
// next.config.ts가 output:"export" + images.unoptimized라 Next가 최적화·병합을 전혀 안 하고
// 소재 그대로의 <img src="...svg">를 낸다. 페이지에 새로 진입할 때마다 그 페이지의 아이콘
// <img>가 전부 새로 마운트되는데, 텍스트·레이아웃은 동기로 페인트되는 반면 <img>는 캐시
// 히트여도 fetch+decode가 비동기라 아이콘만 한두 프레임 늦게 뜬다(issue #470). #437/#438에서
// 국기에 적용한 SVG 스프라이트(<use href="#id">) 패턴을 전 아이콘으로 일반화한 것이 이 스크립트다.
//
// 국기 스프라이트(build-flag-sprite.mjs)와 다른 점 셋:
//  1. 국기는 좌표계(viewBox)가 전부 같지만, 일반 아이콘은 20x20·24x24 등 제각각이라
//     심볼마다 자기 viewBox를 그대로 갖는다. <use>는 소비 쪽 <svg>가 박스를 잡아주므로
//     viewBox가 달라도 문제없다.
//  2. 국기는 파일명이 곧 국가 코드라 접두사 하나로 충분하지만, 일반 아이콘은 폴더가 다르면
//     같은 파일명이 나온다(trash.svg가 app-bar/·chat/ 양쪽에 있음). 그래서 심볼 id는
//     "폴더-파일명"이다.
//  3. 국기는 내부 id가 Figma 노드 id라 파일 간 충돌이 거의 없어 충돌 시 에러로 잡지만,
//     일반 아이콘은 "Icon", "Vector", "clip0_1_2" 같은 흔한 id를 여러 파일이 그대로 써서
//     충돌이 실제로 난다. 그래서 여기서는 심볼마다 내부 id를 전부 이름공간을 씌워 리네임한다
//     (clip-path/mask 참조도 같이 고쳐준다).
//
// 산출물은 public/icons/icons.svg이며 커밋해서 쓴다. 아이콘 원본이 바뀔 때만 다시 구우면
// 되는 결정적 산출물이고, static export라 빌드 파이프라인에 넣을 이유가 없다.
//
// 사용법: pnpm gen:icon-sprite
//
// 개별 아이콘 파일은 지우지 않는다. 이 스크립트의 원본이기도 하고, 국적 목록처럼 한 화면에
// 아주 많은 수를 그리지 않는 한 개별 파일도 문제가 안 된다.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const ICONS_DIR = path.join(ROOT, "public/icons")
const OUTPUT_FILE = path.join(ICONS_DIR, "icons.svg")

// 국기(flag/)는 자체 스프라이트가 있고, pwa/는 매니페스트용이라 화면에 인라인으로 그리지 않는다.
const EXCLUDED_DIRS = new Set(["flag", "pwa"])

function collectIconFiles() {
  const entries = fs
    .readdirSync(ICONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name))

  const files = []
  for (const dir of entries) {
    const dirPath = path.join(ICONS_DIR, dir.name)
    for (const name of fs.readdirSync(dirPath)) {
      if (!name.endsWith(".svg")) continue
      files.push({ dir: dir.name, file: name, path: path.join(dirPath, name) })
    }
  }

  // 폴더명 다음 파일명으로 정렬해 산출물 diff가 파일 추가·삭제에만 반응하게 한다.
  files.sort((a, b) => (a.dir === b.dir ? a.file.localeCompare(b.file) : a.dir.localeCompare(b.dir)))
  return files
}

// 원본 <svg> 껍데기를 벗겨 열기 태그(속성 읽기용)와 알맹이만 돌려준다.
function splitMarkup(svg, label) {
  const openTag = svg.match(/<svg\b[^>]*>/)
  if (!openTag) throw new Error(`<svg> 루트를 찾을 수 없습니다: ${label}`)

  const closeIndex = svg.lastIndexOf("</svg>")
  if (closeIndex === -1) throw new Error(`</svg>를 찾을 수 없습니다: ${label}`)

  const viewBoxMatch = openTag[0].match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) throw new Error(`viewBox가 없습니다: ${label}`)

  return {
    viewBox: viewBoxMatch[1],
    inner: svg.slice(openTag.index + openTag[0].length, closeIndex).trim(),
  }
}

// "Vector (Stroke)" 같은 원본 id를 안전한 문자만 남겨 접미사로 쓸 수 있게 다듬는다.
function sanitizeIdSuffix(id) {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// 심볼 하나의 알맹이 안에서만 id를 리네임한다(파일 간 href 참조는 없음을 사전 확인했다).
// id="X" 선언과 url(#X) 참조를 함께 고쳐야 clip-path/mask가 다른 아이콘 것을 가리키지 않는다.
function namespaceIds(inner, symbolId, label) {
  const ids = [...new Set([...inner.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id))]
  if (ids.length === 0) return inner

  let result = inner
  const seenSuffixes = new Set()

  for (const originalId of ids) {
    const suffix = sanitizeIdSuffix(originalId)
    if (!suffix) throw new Error(`id를 정규화할 수 없습니다: "${originalId}" (${label})`)
    if (seenSuffixes.has(suffix)) {
      throw new Error(`정규화 후 id가 같은 파일 안에서 겹칩니다: "${originalId}" (${label})`)
    }
    seenSuffixes.add(suffix)

    const namespacedId = `${symbolId}--${suffix}`
    const escaped = originalId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    result = result
      .replace(new RegExp(`id="${escaped}"`, "g"), `id="${namespacedId}"`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, "g"), `url(#${namespacedId})`)
  }

  return result
}

function main() {
  const files = collectIconFiles()
  if (files.length === 0) throw new Error(`아이콘을 하나도 찾지 못했습니다: ${ICONS_DIR}`)

  const seenSymbolIds = new Map()
  const symbols = []

  for (const { dir, file, path: filePath } of files) {
    const symbolId = `${dir}-${file.replace(/\.svg$/, "")}`

    const owner = seenSymbolIds.get(symbolId)
    if (owner) throw new Error(`심볼 id "${symbolId}"가 ${owner}와 ${filePath}에서 겹칩니다`)
    seenSymbolIds.set(symbolId, filePath)

    const raw = fs.readFileSync(filePath, "utf8")
    const { viewBox, inner } = splitMarkup(raw, filePath)
    const namespaced = namespaceIds(inner, symbolId, filePath)

    // fill="none"은 소스 아이콘 전부가 루트 <svg>에 공통으로 갖는 기본값이다(개별 path가
    // 각자 fill/stroke를 명시하므로 실제로는 대부분 무의미하지만, 혹시 명시 안 한 자식이
    // 있을 때 원본과 동일하게 채워지지 않도록 기본값을 그대로 옮겨둔다).
    symbols.push(`<symbol id="${symbolId}" viewBox="${viewBox}" fill="none">\n${namespaced}\n</symbol>`)
  }

  // flags.svg와 동일하게 <use>의 참조 대상으로만 쓰이고 직접 그려지지 않는다. 0×0 +
  // overflow:hidden으로 숨겨 문서에 심어도 레이아웃에 영향이 없다.
  const sprite = [
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">`,
    ...symbols,
    `</svg>`,
    "",
  ].join("\n")

  fs.writeFileSync(OUTPUT_FILE, sprite)

  const bytes = Buffer.byteLength(sprite)
  console.log(
    `아이콘 스프라이트 생성 완료: ${path.relative(ROOT, OUTPUT_FILE)} ` +
      `(${files.length}개, ${(bytes / 1024).toFixed(0)}KB)`
  )
}

main()
