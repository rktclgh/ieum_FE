import * as React from "react"

import { Icon } from "@/components/ui/icon"

// 마이 메인 메뉴 카드의 한 행(아이콘 + 라벨 + 오른쪽 요소).
// Link/button/Drawer 트리거 등 어떤 클릭 요소의 자식으로도 넣을 수 있도록 span으로 렌더한다.
// trailing 미지정 시 기본으로 이동을 뜻하는 chevron(›)을 표시한다.
interface MyMenuRowProps {
  /** 스프라이트 심볼 이름. `public/icons/{dir}/{file}.svg`는 `"{dir}/{file}"`로 쓴다. */
  icon: string
  label: string
  trailing?: React.ReactNode
}

function MyMenuRow({ icon, label, trailing }: MyMenuRowProps) {
  return (
    <span className="flex h-10 w-full items-center justify-between py-2 pl-4 pr-3">
      <span className="flex items-center gap-2">
        <Icon name={icon} width={20} height={20} className="size-5 shrink-0" />
        <span className="text-body-medium-16 text-gray-900">{label}</span>
      </span>
      {trailing ?? (
        <Icon name="arrow/right" width={20} height={20} className="size-5 shrink-0" />
      )}
    </span>
  )
}

export { MyMenuRow }
