import Image from "next/image"

import { cn } from "@/lib/utils"

interface CrossfadeIconProps {
  /** 평소 상태의 아이콘 */
  baseSrc: string
  /** 활성 상태의 아이콘. 보통 baseSrc와 같은 도형의 색만 다른 파일 */
  activeSrc: string
  active: boolean
  /** 정사각형 한 변(px) */
  size?: number
  className?: string
}

/**
 * 색만 다른 두 아이콘을 겹쳐두고 투명도로 전환한다.
 *
 * 아이콘이 next/image로 로드되는 정적 SVG라 CSS로 fill을 바꿀 수 없어,
 * 파일을 스왑하되 뚝 끊기지 않도록 두 장을 크로스페이드한다.
 */
function CrossfadeIcon({ baseSrc, activeSrc, active, size = 24, className }: CrossfadeIconProps) {
  return (
    <span className={cn("relative block shrink-0", className)} style={{ width: size, height: size }}>
      {[
        { src: baseSrc, visible: !active },
        { src: activeSrc, visible: active },
      ].map((layer) => (
        <Image
          key={layer.src}
          src={layer.src}
          alt=""
          width={size}
          height={size}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-200 ease-in-out",
            layer.visible ? "opacity-100" : "opacity-0"
          )}
        />
      ))}
    </span>
  )
}

export { CrossfadeIcon }
