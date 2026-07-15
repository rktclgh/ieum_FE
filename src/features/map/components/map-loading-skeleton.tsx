import { cn } from "@/lib/utils"

// GPS 확보 전 잠깐 보이는 화면. 핀·문구·지형 없이 무채색 배경만 두고,
// 은은한 셔머 띠 하나로 로딩 중임만 암시한다. className으로 페이드 전환을 받는다.
function MapLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 size-full overflow-hidden bg-gray-100",
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full animate-map-skeleton-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none motion-reduce:hidden" />
    </div>
  )
}

export { MapLoadingSkeleton }
