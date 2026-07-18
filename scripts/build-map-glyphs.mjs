// 지도 라벨용 Pretendard SDF 글리프를 굽는다.
//
// MapLibre의 지도 라벨은 DOM 텍스트가 아니라 style.glyphs URL에서 받아오는 SDF 아틀라스라,
// globals.css의 --font-sans나 next/font로는 절대 바뀌지 않는다. OpenFreeMap이 서빙하는 폰트는
// Noto Sans뿐이라(Pretendard Regular → 404), 앱 폰트를 쓰려면 직접 구워서 self-host해야 한다.
//
// 산출물은 public/fonts/<스택명>/<start>-<end>.pbf 이며 커밋해서 쓴다. fontnik이 네이티브 모듈이라
// 빌드 파이프라인에 넣으면 CI에서 깨질 수 있고, 폰트가 바뀔 때만 다시 구우면 되는 결정적 산출물이다.
//
// 사용법: pnpm gen:map-glyphs
//
// Pretendard는 한글(11,172자) · 키릴 · Latin Ext Additional(베트남어) · 가나를 전부 커버하지만
// 한자(0/20,992)와 태국어(1/128)는 없다. 그래서 ja/zh/th 지명은 Noto fallback을 붙이는 대신
// 로마자(name:latin)로 대체한다(features/map/constants/map.ts의 getPlaceLabelTextField 참고).
// 덕분에 스택이 하나로 끝나고 산출물도 8.6MB에서 멈춘다.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import fontnik from "fontnik"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const SOURCE_FONT = path.join(
  ROOT,
  "node_modules/pretendard/dist/public/static/Pretendard-Regular.otf"
)

// style.glyphs의 {fontstack}에 그대로 들어가는 이름. map.ts의 MAP_FONT_STACK과 반드시 일치해야 한다.
const FONT_STACK = "Pretendard Regular"

const OUTPUT_DIR = path.join(ROOT, "public/fonts", FONT_STACK)

// MapLibre는 유니코드를 256자 단위로 끊어 range별로 요청하고, 화면에 보이는 range만 lazy load한다.
const RANGE_SIZE = 256
const UNICODE_MAX = 65536

// fontnik은 글리프가 하나도 없는 range에도 빈 pbf를 돌려준다. 그대로 쓰면 8MB짜리가 20MB가 되므로
// 글리프가 실제로 든 range만 남긴다. Pretendard 실측 결과 빈 pbf는 최대 35바이트, 글리프가 1개라도
// 든 range는 최소 153바이트라, 그 사이인 50바이트를 경계로 잡으면 빈 것만 안전하게 걸러진다.
// (1024처럼 크게 잡으면 글리프 1~2개짜리 희소 range가 통째로 누락된다.)
const EMPTY_PBF_MAX_BYTES = 50

function range(font, start) {
  return new Promise((resolve, reject) => {
    fontnik.range({ font, start, end: start + RANGE_SIZE - 1 }, (error, buffer) => {
      if (error) reject(error)
      else resolve(buffer)
    })
  })
}

async function main() {
  if (!fs.existsSync(SOURCE_FONT)) {
    throw new Error(`Pretendard 원본 폰트를 찾을 수 없습니다: ${SOURCE_FONT}`)
  }

  const font = fs.readFileSync(SOURCE_FONT)

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  let written = 0
  let bytes = 0

  for (let start = 0; start < UNICODE_MAX; start += RANGE_SIZE) {
    const buffer = await range(font, start)
    if (!buffer || buffer.length <= EMPTY_PBF_MAX_BYTES) continue

    fs.writeFileSync(path.join(OUTPUT_DIR, `${start}-${start + RANGE_SIZE - 1}.pbf`), buffer)
    written += 1
    bytes += buffer.length
  }

  console.log(
    `${FONT_STACK}: ${written} ranges, ${(bytes / 1024 / 1024).toFixed(2)} MB → ${path.relative(ROOT, OUTPUT_DIR)}`
  )
}

await main()
