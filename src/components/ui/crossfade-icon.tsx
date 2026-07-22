import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

interface CrossfadeIconProps {
  /** 평소 상태의 아이콘. 스프라이트 심볼 이름(예: "circle/location") */
  baseSrc: string
  /** 활성 상태의 아이콘. 보통 baseSrc와 같은 도형의 색만 다른 심볼 */
  activeSrc: string
  active: boolean
  /** 정사각형 한 변(px) */
  size?: number
  className?: string
}

/**
 * 색만 다른 두 아이콘을 겹쳐두고 투명도로 전환한다.
 *
 * 두 심볼이 같은 도형의 색만 달라 CSS로 fill을 바꿀 수 없어,
 * 심볼을 스왑하되 뚝 끊기지 않도록 두 장을 크로스페이드한다.
 */
function CrossfadeIcon({ baseSrc, activeSrc, active, size = 24, className }: CrossfadeIconProps) {
  return (
    <span className={cn("relative block shrink-0", className)} style={{ width: size, height: size }}>
      {[
        { name: baseSrc, visible: !active },
        { name: activeSrc, visible: active },
      ].map((layer) => (
        <Icon
          key={layer.name}
          name={layer.name}
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
