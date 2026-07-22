"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { Icon } from "@/components/ui/icon"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NotificationListAppBarProps extends React.ComponentProps<typeof AppBar> {
  onBack?: () => void
  onEnterDeleteMode?: () => void
  onOpenSettings?: () => void
  deleteMode?: boolean
}

// 알림센터 상단바 — 뒤로가기 + 가운데 제목 + 우측 쓰레기통·톱니.
// 컨테이너·safe-area·뒤로가기 버튼·제목 중앙정렬은 공용 AppBar에 위임하고(issue #419),
// 여기서는 이 화면 고유의 trailing 액션만 그린다. 우측 아이콘이 둘이라 제목이 밀리므로
// AppBar의 centerTitle로 절대 중앙에 고정한다.
// 쓰레기통은 삭제 모드 진입용이라 삭제 모드에서는 숨기고 톱니만 남긴다(시안 1835:11204).
function NotificationListAppBar({
  onBack,
  onEnterDeleteMode,
  onOpenSettings,
  deleteMode,
  ...props
}: NotificationListAppBarProps) {
  const { messages } = useTranslation()

  return (
    <AppBar
      title={messages.notification.appBarTitle}
      centerTitle
      onLeadingClick={onBack}
      trailingSlot={
        <div className="flex shrink-0 items-center gap-3">
          {!deleteMode && (
            <button
              type="button"
              aria-label={messages.notification.deleteModeLabel}
              onClick={onEnterDeleteMode}
              className="flex size-6 shrink-0 items-center justify-center"
            >
              <Icon name="app-bar/trash" width={24} height={24} className="size-6" />
            </button>
          )}
          <button
            type="button"
            aria-label={messages.notification.settingsLabel}
            onClick={onOpenSettings}
            className="flex size-6 shrink-0 items-center justify-center"
          >
            <Icon name="app-bar/setting" width={24} height={24} className="size-6" />
          </button>
        </div>
      }
      {...props}
    />
  )
}

export { NotificationListAppBar }
