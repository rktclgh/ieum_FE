"use client"

import * as React from "react"
import Image from "next/image"
import { Download } from "lucide-react"

import { BottomSheetClose } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { ChatContextMenu } from "@/features/chat/components/chat-context-menu"
import type { MeetupDetailView } from "@/features/meetup/lib/meetup-adapter"
import { TranslateLongPress } from "@/features/translate/components/translate-long-press"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useSaveImage } from "@/lib/hooks/use-save-image"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { cn } from "@/lib/utils"

interface MeetupDetailCardProps {
  detail: MeetupDetailView
  pending: boolean
  error?: string | null
  onJoin: () => void
  onEnterRoom: () => void
  /**
   * 이 카드가 화면에 노출 중인지. false면 롱프레스 메뉴를 닫는다.
   * 시트는 닫힘 여부를, 캐러셀은 활성 슬라이드 여부를 넘긴다 — 메뉴의 dim 오버레이가
   * 안 보이는 카드에 남아 화면을 덮는 것을 막는다.
   */
  active?: boolean
  /** 번역 메뉴 노출 조건. 비로그인이면 롱프레스가 무반응이다. */
  isAuthenticated?: boolean
}

function InfoRow({ iconSrc, children }: { iconSrc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <Image src={iconSrc} alt="" width={18} height={18} className="size-[18px]" />
      <span className="text-body-regular-14 text-gray-600">{children}</span>
    </div>
  )
}

/**
 * 모임 상세 카드 본문(프레젠테이셔널).
 *
 * BottomSheet 루트를 갖지 않아, 단일 시트(MeetupDetailSheet)와 겹친 핀 캐러셀(PinStackSheet)
 * 양쪽에서 같은 본문을 재사용한다. 닫기 버튼(BottomSheetClose)은 Drawer 컨텍스트를 쓰므로
 * 반드시 BottomSheet 하위에서 렌더해야 한다.
 */
function MeetupDetailCard({
  detail,
  pending,
  error,
  onJoin,
  onEnterRoom,
  active = true,
  isAuthenticated = false,
}: MeetupDetailCardProps) {
  const { messages } = useTranslation()
  const t = messages.meetup

  const [imageMenuOpen, setImageMenuOpen] = React.useState(false)
  const saveImageAction = useSaveImage()
  const imageLongPress = useLongPress({ onLongPress: () => setImageMenuOpen(true) })

  // 렌더 중 상태 조정(React 권장 패턴) — 카드가 가려지면 effect 없이 즉시 메뉴를 닫는다.
  if (!active && imageMenuOpen) setImageMenuOpen(false)

  const imageUrl = detail.imageUrl
  const hasImage = Boolean(imageUrl)
  const isOpen = detail.status === "open"
  // 방장·참여자 모두 시트에선 '채팅방 가기'만 노출한다. 나가기는 채팅방 더보기로 일원화(#249).
  const isJoined = detail.isHost || detail.myStatus === "joined"
  const closedLabel = detail.status === "cancelled" ? t.statusCancelled : t.statusClosed

  return (
    <>
      {hasImage ? (
        // 메뉴가 top-full 로 앵커되므로 클리핑(overflow-hidden)은 안쪽 컨테이너에만 남긴다.
        <div
          className={cn(
            "relative w-full",
            LONG_PRESS_TRANSITION,
            imageMenuOpen ? LONG_PRESS_LIFT_ACTIVE : LONG_PRESS_INACTIVE
          )}
          {...imageLongPress}
        >
          <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={t.imageAlt} className="size-full object-cover" />
            <BottomSheetClose
              aria-label={t.closeLabel}
              className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50"
            >
              <Image src="/icons/circle/close-white.svg" alt="" width={16} height={16} className="size-4" />
            </BottomSheetClose>
          </div>
          {imageMenuOpen && imageUrl ? (
            <ChatContextMenu
              items={[
                {
                  icon: <Download className="size-6 text-gray-900" />,
                  label: messages.common.saveImage,
                  onClick: () => {
                    setImageMenuOpen(false)
                    void saveImageAction.save(imageUrl)
                  },
                },
              ]}
              dimmed
              onDismiss={() => setImageMenuOpen(false)}
              className="top-full left-1/2 mt-3 -translate-x-1/2"
            />
          ) : null}
        </div>
      ) : null}

      {/* 본문 롱프레스 → 번역 메뉴(#463). 이미지·닫기·참여 버튼은 제외한다.
          제목/정보/설명이 원래 팝업의 gap-4 로 벌어진 형제라, 묶는 래퍼도 같은 간격을 준다. */}
      <TranslateLongPress
        title={detail.title}
        body={detail.description ?? ""}
        isAuthenticated={isAuthenticated}
        anchor="surface"
        visible={active}
        persistMenu
      >
        {({ title, body, longPress }) => (
          <div className="flex w-full flex-col gap-4" {...longPress}>
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-title-semibold-18 text-gray-900">{title}</h2>
                {!hasImage ? (
                  <BottomSheetClose
                    aria-label={t.closeLabel}
                    // 닫기 버튼은 롱프레스 대상에서 제외한다 — 전파를 끊지 않으면 버튼을
                    // 길게 눌러도 본문 번역 메뉴가 열린다.
                    onPointerDown={(event) => event.stopPropagation()}
                    className="flex size-6 shrink-0 items-center justify-center"
                  >
                    <Image src="/icons/app-bar/close.svg" alt="" width={24} height={24} className="size-6" />
                  </BottomSheetClose>
                ) : null}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <InfoRow iconSrc="/icons/meetup/time.svg">
                    {detail.dateLabel || t.noSchedule}
                  </InfoRow>
                  <InfoRow iconSrc="/icons/meetup/location.svg">{detail.locationLabel}</InfoRow>
                </div>
                <InfoRow iconSrc="/icons/meetup/people.svg">
                  {t.participantCount(detail.participantCount)}
                </InfoRow>
              </div>
            </div>

            {body ? (
              <p className="w-full text-body-regular-14 whitespace-pre-line text-gray-600">{body}</p>
            ) : null}
          </div>
        )}
      </TranslateLongPress>

      {error ? <p className="w-full text-body-regular-12 text-red">{error}</p> : null}

      {/* 액션: 참여(방장·멤버) 여부에 따라 분기. 나가기는 채팅방 더보기에서만 처리한다. */}
      <div className="flex w-full flex-col gap-2">
        {isJoined ? (
          <Button variant="accent" size="block" disabled={pending} onClick={onEnterRoom}>
            {t.enterRoomButton}
          </Button>
        ) : (
          <Button variant="accent" size="block" disabled={pending || !isOpen} onClick={onJoin}>
            {isOpen ? t.joinButton : closedLabel}
          </Button>
        )}
      </div>

      <Toast open={saveImageAction.failed} message={messages.common.saveImageFailed} />
    </>
  )
}

export { MeetupDetailCard }
