import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { CrossfadeIcon } from "@/components/ui/crossfade-icon"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

const circleVariants = cva("inline-flex size-[46px] shrink-0 items-center justify-center rounded-full", {
  variants: {
    background: {
      white: "bg-white",
      primary: "bg-primary",
    },
    tone: {
      elevated: "shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)]",
      flat: "border border-gray-100",
    },
  },
  compoundVariants: [
    {
      // 흰 배경 위에서 가장자리를 잡아주는 테두리. primary 배경에서는 흰 선으로 도드라져 보여 제외한다.
      background: "white",
      tone: "elevated",
      className: "outline outline-1 -outline-offset-1 outline-gray-50",
    },
  ],
  defaultVariants: {
    background: "white",
    tone: "elevated",
  },
})

interface CircleProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof circleVariants> {
  /** 스프라이트 심볼 이름. `public/icons/{dir}/{file}.svg`는 `"{dir}/{file}"`로 쓴다. */
  iconSrc: string
  /** 내부 아이콘 이미지에 추가할 CSS 클래스명 (예: 회전/트랜지션 애니메이션은 호출부에서 주입) */
  iconClassName?: string
  /** 켜짐 상태에서 보여줄 아이콘. 주면 iconSrc와 크로스페이드되고 aria-pressed가 붙는다 */
  activeIconSrc?: string
  /** activeIconSrc가 있을 때만 의미가 있다 */
  active?: boolean
}

function Circle({
  className,
  background,
  tone,
  iconSrc,
  iconClassName,
  activeIconSrc,
  active,
  ...props
}: CircleProps) {
  return (
    <button
      type="button"
      data-slot="circle"
      aria-pressed={activeIconSrc ? Boolean(active) : undefined}
      className={cn(circleVariants({ background, tone, className }))}
      {...props}
    >
      {activeIconSrc ? (
        <CrossfadeIcon
          baseSrc={iconSrc}
          activeSrc={activeIconSrc}
          active={Boolean(active)}
          className={iconClassName}
        />
      ) : (
        <Icon name={iconSrc} width={24} height={24} className={cn("size-6", iconClassName)} />
      )}
    </button>
  )
}

export { Circle, circleVariants }
