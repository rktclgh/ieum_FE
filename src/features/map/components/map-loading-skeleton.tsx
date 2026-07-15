import { cn } from "@/lib/utils"

// GPS 확보 전 잠깐 보이는 화면. 핀·문구·녹지·하천 없이 무채색 배경에 도로망 정도만 남겨
// "지도가 뜰 자리"임을 암시한다. 은은한 셔머 띠로 로딩 중임만 표시. className으로 페이드 전환을 받는다.
const LAND = "#ebebeb"
const ROAD = "#ffffff"
const CASING = "#dcdcdc"

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
  { d: "M-20 168 L320 188", casing: 15, road: 9 },
  { d: "M-20 350 L320 366", casing: 15, road: 9 },
  { d: "M-20 496 Q160 484 320 520", casing: 12, road: 7 },
  { d: "M150 -20 L150 468", casing: 15, road: 9 },
  { d: "M150 468 L64 640", casing: 12, road: 7 },
  { d: "M232 -20 L252 470", casing: 12, road: 7 },
  { d: "M92 150 L100 500", casing: 9, road: 5 },
  { d: "M150 356 L240 520", casing: 10, road: 5.5 },
  { d: "M196 356 L268 460", casing: 9, road: 4.5 },
]

function MapLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("absolute inset-0 size-full overflow-hidden", className)}
      style={{ background: LAND }}
      aria-hidden
    >
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 300 620"
        preserveAspectRatio="xMidYMid slice"
      >
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
      </svg>

      <div className="absolute inset-0 -translate-x-full animate-map-skeleton-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent motion-reduce:animate-none motion-reduce:hidden" />
    </div>
  )
}

export { MapLoadingSkeleton }
