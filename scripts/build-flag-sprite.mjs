// 국적 선택 시트용 국기 SVG 스프라이트를 굽는다.
//
// 국기는 public/icons/flag/flag-0.svg ~ flag-198.svg 로 199개가 개별 파일이다. 국적 시트는
// 이걸 한 화면에 전부 나열하는 유일한 곳이라, next/image로 그리면 파일당 요청 1개 = 199 요청이
// 된다. next.config.ts가 output:"export" + images.unoptimized라 Next가 합쳐주지도 않고,
// 브라우저 동시 연결 한도(~6) 때문에 lazy를 꺼도 국기가 순차적으로 팝인한다.
//
// 199개를 합쳐도 gzip 42KB(원본 844KB)라 용량이 아니라 요청 개수가 문제다. 그래서 <symbol>
// 하나짜리 스프라이트로 구워 요청 1번에 끝낸다.
//
// 산출물은 public/icons/flag/flags.svg 이며 커밋해서 쓴다. 국기 원본이 바뀔 때만 다시 구우면
// 되는 결정적 산출물이고, static export라 빌드 파이프라인에 넣을 이유가 없다.
//
// 사용법: pnpm gen:flag-sprite
//
// 개별 flag-N.svg는 지우지 않는다. 채팅·친구·마이의 CountryFlag는 한 화면에 국기가 몇 개뿐이라
// 개별 파일 요청이 문제가 안 되고, 이 스프라이트의 원본이기도 하다.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const COUNTRIES_SOURCE = path.join(ROOT, "src/lib/constants/countries.ts")
const FLAG_DIR = path.join(ROOT, "public/icons/flag")
const OUTPUT_FILE = path.join(FLAG_DIR, "flags.svg")

// 심볼 id 접두사. src/components/ui/flag-icon.tsx의 FLAG_SYMBOL_PREFIX와 반드시 일치해야 한다.
const SYMBOL_PREFIX = "flag-"

// 원본 국기가 전부 공유하는 좌표계. 하나라도 다르면 스프라이트에서 크기가 틀어지므로 검증한다.
const VIEW_BOX = "0 0 21 15"

// countries.ts의 `{ code: "south-korea", flag: "/icons/flag/flag-33.svg" }` 항목을 읽는다.
// TS를 실행하지 않고 정규식으로 읽는 이유: 이 스크립트를 node 20에서도 돌릴 수 있게 하기 위함.
// (--experimental-strip-types는 node 22+ 전용이다.)
const COUNTRY_ENTRY = /\{\s*code:\s*"([^"]+)",\s*flag:\s*"\/icons\/flag\/([^"]+)"\s*\}/g

function readCountries() {
  const source = fs.readFileSync(COUNTRIES_SOURCE, "utf8")
  const countries = [...source.matchAll(COUNTRY_ENTRY)].map(([, code, file]) => ({ code, file }))

  if (countries.length === 0) {
    throw new Error(`countries.ts에서 국가 항목을 하나도 읽지 못했습니다: ${COUNTRIES_SOURCE}`)
  }

  return countries
}

// 원본 <svg> 껍데기를 벗기고 알맹이만 돌려준다. 껍데기의 width/height는 CSS로 잡을 것이고,
// viewBox는 <symbol>로 옮겨간다.
function extractInnerMarkup(svg, file) {
  const openTag = svg.match(/<svg\b[^>]*>/)
  if (!openTag) {
    throw new Error(`<svg> 루트를 찾을 수 없습니다: ${file}`)
  }

  if (!openTag[0].includes(`viewBox="${VIEW_BOX}"`)) {
    throw new Error(`viewBox가 "${VIEW_BOX}"가 아닙니다 (스프라이트에서 크기가 틀어집니다): ${file}`)
  }

  const closeIndex = svg.lastIndexOf("</svg>")
  if (closeIndex === -1) {
    throw new Error(`</svg>를 찾을 수 없습니다: ${file}`)
  }

  return svg.slice(openTag.index + openTag[0].length, closeIndex).trim()
}

function main() {
  const countries = readCountries()

  // 원본 국기들의 내부 id(clip0_1258_6498 등)는 Figma 노드 id라 파일 간에도 겹치지 않는다.
  // 그래도 한 문서에 합치는 이상 하나라도 겹치면 다른 국기의 clipPath/mask를 먹어 조용히
  // 깨지므로, 리네임 대신 여기서 충돌을 잡아 크게 실패시킨다.
  const seenIds = new Map()
  const symbols = []

  for (const { code, file } of countries) {
    const filePath = path.join(FLAG_DIR, file)
    if (!fs.existsSync(filePath)) {
      throw new Error(`국기 원본을 찾을 수 없습니다: ${filePath} (${code})`)
    }

    const svg = fs.readFileSync(filePath, "utf8")
    const inner = extractInnerMarkup(svg, file)

    for (const [, id] of inner.matchAll(/\sid="([^"]+)"/g)) {
      const owner = seenIds.get(id)
      if (owner) {
        throw new Error(
          `내부 id "${id}"가 ${owner}와 ${file}에서 겹칩니다. ` +
            `합치면 서로의 clipPath/mask를 참조해 국기가 깨집니다.`
        )
      }
      seenIds.set(id, file)
    }

    symbols.push(
      `<symbol id="${SYMBOL_PREFIX}${code}" viewBox="${VIEW_BOX}" fill="none">\n${inner}\n</symbol>`
    )
  }

  // 이 파일은 <use>의 참조 대상으로만 쓰이고 직접 그려지지 않는다. display:none 대신 0×0 +
  // overflow:hidden으로 숨기는 건, 주입한 문서에서 레이아웃에 전혀 영향을 주지 않으면서
  // <use> 참조는 확실히 살아있게 하는 가장 안전한 조합이기 때문이다.
  const sprite = [
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">`,
    ...symbols,
    `</svg>`,
    "",
  ].join("\n")

  fs.writeFileSync(OUTPUT_FILE, sprite)

  const bytes = Buffer.byteLength(sprite)
  console.log(
    `국기 스프라이트 생성 완료: ${path.relative(ROOT, OUTPUT_FILE)} ` +
      `(${countries.length}개, ${(bytes / 1024).toFixed(0)}KB)`
  )
}

main()
