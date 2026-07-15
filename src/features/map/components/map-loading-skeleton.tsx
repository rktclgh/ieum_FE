"use client"

import { useTranslation } from "@/lib/i18n/use-translation"

// 로딩 스켈레톤은 실제 베이스맵(CARTO Positron)의 색과 서울 도심 도로망을 정적으로 반영한다.
// GPS 확보 전 잠깐 보이는 화면이므로 애니메이션 요소는 중앙 "내 위치 찾는 중" 펄스 하나뿐이다.
const LAND = "#ebecee"
const ROAD = "#ffffff"
const CASING = "#d9dde1"
const WATER = "#c7d5da"
const GREEN = "#dde5dc"
const LIVE_ACCENT = "#316CED"

// 블록을 형성하는 잔길(얇은 흰 도로)
const MINOR_STREETS = [
  "M24 258 L146 254",
  "M160 300 L300 312",
  "M22 306 L142 304",
  "M42 410 L146 410",
  "M162 432 L300 448",
  "M60 560 L232 576",
  "M64 44 L70 168",
  "M210 44 L214 166",
  "M112 190 L116 350",
  "M196 190 L200 348",
  "M124 382 L128 492",
  "M262 210 L272 460",
  "M30 470 L150 468",
]

// 주요 간선: 케이싱(외곽선) 위에 흰 도로 본체를 겹쳐 그린다.
const ARTERIALS = [
  { d: "M-20 168 L320 188", casing: 15, road: 9 }, // 종로
  { d: "M-20 350 L320 366", casing: 15, road: 9 }, // 을지로
  { d: "M-20 496 Q160 484 320 520", casing: 12, road: 7 }, // 퇴계로/남대문로
  { d: "M150 -20 L150 468", casing: 15, road: 9 }, // 세종대로
  { d: "M150 468 L64 640", casing: 12, road: 7 }, // 남대문로 사선
  { d: "M232 -20 L252 470", casing: 12, road: 7 }, // 삼일대로
  { d: "M92 150 L100 500", casing: 9, road: 5 }, // 정동길
  { d: "M150 356 L240 520", casing: 10, road: 5.5 }, // 명동 사선 1
  { d: "M196 356 L268 460", casing: 9, road: 4.5 }, // 명동 사선 2
]

// 좌측 행정경계 + 철도(경의선) 점선
const DASHED_LINES = [
  { d: "M40 -20 C58 120 22 260 46 400 S30 560 54 640", width: 2, dash: "2 6", opacity: 1 },
  { d: "M80 -20 L98 462", width: 3, dash: "1 7", opacity: 0.8 },
]

function MapLoadingSkeleton() {
  const { messages } = useTranslation()

  return (
    <div
      className="absolute inset-0 z-0 size-full overflow-hidden"
      style={{ background: LAND }}
      aria-hidden
    >
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 300 620"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x="0" y="0" width="300" height="620" fill={LAND} />

        {/* 녹지: 덕수궁·경희궁 블록 */}
        <rect x="60" y="360" width="58" height="66" rx="11" fill={GREEN} />
        <rect x="54" y="86" width="46" height="44" rx="10" fill={GREEN} />

        {/* 청계천 */}
        <path d="M-20 232 Q150 224 320 250" stroke={WATER} strokeWidth={4} fill="none" opacity={0.9} />

        {/* 잔길 */}
        <g stroke={ROAD} fill="none" strokeLinecap="round" strokeWidth={2.4} opacity={0.95}>
          {MINOR_STREETS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {/* 간선 케이싱 */}
        <g stroke={CASING} fill="none" strokeLinecap="round">
          {ARTERIALS.map((r) => (
            <path key={`c-${r.d}`} d={r.d} strokeWidth={r.casing} />
          ))}
        </g>
        {/* 간선 본체(흰색) */}
        <g stroke={ROAD} fill="none" strokeLinecap="round">
          {ARTERIALS.map((r) => (
            <path key={`r-${r.d}`} d={r.d} strokeWidth={r.road} />
          ))}
        </g>

        {/* 행정경계·철도 점선 */}
        <g fill="none" stroke={CASING} strokeLinecap="round">
          {DASHED_LINES.map((l) => (
            <path key={l.d} d={l.d} strokeWidth={l.width} strokeDasharray={l.dash} opacity={l.opacity} />
          ))}
        </g>
      </svg>

      {/* 중앙 "내 위치 찾는 중" 펄스 */}
      <div className="absolute left-1/2 top-[46%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="relative size-[18px]">
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-50 motion-reduce:animate-none"
            style={{ background: LIVE_ACCENT }}
          />
          <span
            className="absolute inset-[3px] rounded-full"
            style={{
              background: LIVE_ACCENT,
              boxShadow: "0 0 0 3px #ffffff, 0 0 10px rgba(49,108,237,0.6)",
            }}
          />
        </div>
        <span
          className="mt-3.5 rounded-full bg-white px-2.5 py-1 text-body-regular-12 font-semibold text-gray-700"
          style={{ boxShadow: "0 4px 14px -6px rgba(0,0,0,0.35)" }}
        >
          {messages.home.locatingMe}
        </span>
      </div>
    </div>
  )
}

export { MapLoadingSkeleton }
