"use client"

// 백엔드 연동 전 채팅 UI 컴포넌트를 눈으로 확인하기 위한 테스트 페이지 (프로덕션 라우트 아님)

import * as React from "react"
import Image from "next/image"

import { useTranslation } from "@/lib/i18n/use-translation"
import { SearchBox } from "@/components/ui/search-box"
import { Circle } from "@/components/ui/circle"
import { ChatFilterChips } from "@/features/chat/components/chat-filter-chips"
import { FriendListAppBar } from "@/features/chat/components/friend-list-app-bar"
import { ChatListItem } from "@/features/chat/components/chat-list-item"
import { SectionTitle } from "@/features/chat/components/section-title"
import { FriendRequestItem } from "@/features/chat/components/friend-request-item"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { NoticeBanner } from "@/features/chat/components/notice-banner"
import { ChatDateDivider } from "@/features/chat/components/chat-date-divider"
import { ChatBubble } from "@/features/chat/components/chat-bubble"
import { ChatMessageInput } from "@/features/chat/components/chat-message-input"
import { ChatRoomProfile } from "@/features/chat/components/chat-room-profile"
import { ChatRoomInfoSection } from "@/features/chat/components/chat-room-info-section"
import { ChatRoomMemberItem } from "@/features/chat/components/chat-room-member-item"
import { ChatRoomDangerActions } from "@/features/chat/components/chat-room-danger-actions"
import {
  MOCK_CHATS,
  MOCK_FRIEND_REQUESTS,
  MOCK_MY_FRIENDS,
  MOCK_RECOMMENDED_FRIENDS,
  MOCK_SEARCH_RESULTS,
  MOCK_MESSAGES,
  MOCK_MEMBERS,
} from "@/features/chat/constants/mock-data"

function TestSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-gray-100 pb-8">
      <h2 className="text-title-semibold-18 text-gray-900">{title}</h2>
      <div className="rounded-2xl border border-gray-100 bg-white p-4">{children}</div>
    </section>
  )
}

export default function ChatComponentsTestPage() {
  const { messages } = useTranslation()
  const [showListMenu, setShowListMenu] = React.useState(false)
  const [showRoomMenus, setShowRoomMenus] = React.useState(false)
  const [noticeVisible, setNoticeVisible] = React.useState(true)
  const [rejectTarget, setRejectTarget] = React.useState<(typeof MOCK_FRIEND_REQUESTS)[number] | null>(null)

  const listMenuItems: ChatContextMenuItem[] = [
    { icon: <Image src="/icons/chat/pin-line.svg" alt="" width={24} height={24} />, label: messages.chat.pinAction },
    { icon: <Image src="/icons/chat/alarm-off.svg" alt="" width={24} height={24} />, label: messages.chat.muteAction },
    {
      icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
      label: messages.chat.deleteAction,
      tone: "destructive",
    },
  ]

  const friendMenuItems: ChatContextMenuItem[] = [
    {
      icon: <Image src="/icons/chat/block.svg" alt="" width={24} height={24} />,
      label: messages.chat.blockAction,
      tone: "destructive",
    },
    {
      icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
      label: messages.chat.deleteAction,
      tone: "destructive",
    },
  ]

  const cameraMenuItems: ChatContextMenuItem[] = [
    { icon: <Image src="/icons/chat/camera-line.svg" alt="" width={24} height={24} />, label: messages.chat.takePhotoAction },
    { icon: <Image src="/icons/chat/image.svg" alt="" width={24} height={24} />, label: messages.chat.chooseAlbumAction },
  ]

  const pressMenuItems: ChatContextMenuItem[] = [
    { icon: <Image src="/icons/chat/respond.svg" alt="" width={24} height={24} />, label: messages.chat.replyAction },
    {
      icon: <Image src="/icons/chat/alert.svg" alt="" width={24} height={24} />,
      label: messages.chat.reportAction,
      tone: "destructive",
    },
  ]

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-10 p-4 pb-24">
      <h1 className="text-title-bold-24 text-gray-900">Chat Components Test</h1>

      <TestSection title="채팅 목록">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 py-2">
            <SearchBox placeholder={messages.chat.listSearchPlaceholder} className="flex-1" readOnly />
            <Circle iconSrc="/icons/circle/friend-list.svg" />
          </div>
          <ChatFilterChips />
          <div className="flex flex-col">
            {MOCK_CHATS.map((chat) => (
              <ChatListItem key={chat.id} {...chat} />
            ))}
          </div>
          <div className="relative h-16">
            <button
              type="button"
              className="text-body-regular-13 text-gray-500 underline"
              onClick={() => setShowListMenu((prev) => !prev)}
            >
              롱프레스 메뉴(고정/알림해제/삭제) 토글
            </button>
            {showListMenu && (
              <ChatContextMenu
                items={listMenuItems}
                dimmed
                onDismiss={() => setShowListMenu(false)}
                style={{ top: 8, left: 16 }}
              />
            )}
          </div>
        </div>
      </TestSection>

      <TestSection title="친구 목록 (채팅목록 → 친구목록)">
        <div className="flex flex-col">
          <FriendListAppBar className="-mx-4 -mt-4 mb-2 w-auto" />
          <SectionTitle title={messages.chat.receivedRequestsTitle} count={MOCK_FRIEND_REQUESTS.length} />
          {MOCK_FRIEND_REQUESTS.map((friend) => (
            <FriendRequestItem
              key={friend.id}
              name={friend.name}
              flagSrc={friend.flagSrc}
              nation={messages.countries[friend.countryCode]}
              variant="request"
              onReject={() => setRejectTarget(friend)}
            />
          ))}
          <SectionTitle title={messages.chat.myFriendsSectionTitle} count={MOCK_MY_FRIENDS.length} />
          {MOCK_MY_FRIENDS.map((friend) => (
            <FriendRequestItem
              key={friend.id}
              name={friend.name}
              flagSrc={friend.flagSrc}
              nation={messages.countries[friend.countryCode]}
              variant="friend"
            />
          ))}
          <div className="relative mt-4 h-16">
            <p className="text-body-regular-13 text-gray-500">친구목록 롱프레스 메뉴(차단/삭제) 항상 표시:</p>
            <ChatContextMenu items={friendMenuItems} style={{ top: 24, left: 0 }} />
          </div>
          {rejectTarget && (
            <ConfirmDialog
              open={Boolean(rejectTarget)}
              onOpenChange={(open) => !open && setRejectTarget(null)}
              title={messages.chat.rejectConfirmTitle(rejectTarget.name)}
              description={messages.chat.rejectConfirmDescription}
              cancelLabel={messages.chat.cancelButton}
              confirmLabel={messages.chat.rejectButton}
              onConfirm={() => setRejectTarget(null)}
            />
          )}
        </div>
      </TestSection>

      <TestSection title="친구 추가 (친구목록 → 친구추가)">
        <div className="flex flex-col">
          <SectionTitle title={messages.chat.receivedRequestsTitle} count={MOCK_FRIEND_REQUESTS.length} />
          {MOCK_FRIEND_REQUESTS.map((friend) => (
            <FriendRequestItem
              key={friend.id}
              name={friend.name}
              flagSrc={friend.flagSrc}
              nation={messages.countries[friend.countryCode]}
              variant="request"
            />
          ))}
          <SectionTitle title={messages.chat.recommendedFriendsTitle} />
          {MOCK_RECOMMENDED_FRIENDS.map((friend) => (
            <FriendRequestItem
              key={friend.id}
              name={friend.name}
              flagSrc={friend.flagSrc}
              nation={messages.countries[friend.countryCode]}
              variant={friend.requested ? "requested" : "add"}
            />
          ))}
        </div>
      </TestSection>

      <TestSection title="친구 검색 (검색어 강조 표시)">
        <div className="flex flex-col">
          {MOCK_SEARCH_RESULTS.map((friend) => (
            <FriendRequestItem
              key={friend.id}
              name={friend.name}
              highlightQuery="와레"
              flagSrc={friend.flagSrc}
              nation={messages.countries[friend.countryCode]}
              variant={friend.requested ? "requested" : "add"}
            />
          ))}
        </div>
      </TestSection>

      <TestSection title="채팅방 (메시지)">
        <div className="flex flex-col gap-3">
          {noticeVisible && (
            <NoticeBanner text="7월 3일 오후 7시 용산역 1번 출구!!!" onClose={() => setNoticeVisible(false)} />
          )}
          <div className="flex flex-col">
            <ChatDateDivider text="2026년 7월 3일" />
            {MOCK_MESSAGES.map((message) => (
              <ChatBubble key={message.id} {...message} />
            ))}
          </div>
          <ChatMessageInput onSend={(value) => console.log("send:", value)} />
          <div className="relative h-16">
            <button
              type="button"
              className="text-body-regular-13 text-gray-500 underline"
              onClick={() => setShowRoomMenus((prev) => !prev)}
            >
              카메라 버튼 메뉴 / 말풍선 롱프레스 메뉴 토글
            </button>
            {showRoomMenus && (
              <>
                <ChatContextMenu items={cameraMenuItems} style={{ top: 24, left: 0 }} />
                <ChatContextMenu items={pressMenuItems} style={{ top: 24, left: 200 }} />
              </>
            )}
          </div>
        </div>
      </TestSection>

      <TestSection title="채팅방 설정">
        <div className="flex flex-col gap-3">
          <ChatRoomProfile title="7시에 용산에서 볼 사람" />
          <ChatRoomInfoSection />
          <div className="flex flex-col rounded-2xl bg-gray-50">
            <SectionTitle title={messages.chat.membersTitle} count={MOCK_MEMBERS.length} padding="12" />
            {MOCK_MEMBERS.map((member) => (
              <ChatRoomMemberItem
                key={member.id}
                name={member.name}
                isMe={member.isMe}
                isOwner={member.isOwner}
                flagSrc={member.flagSrc}
                nation={messages.countries[member.countryCode]}
                onRemove={member.isMe ? undefined : () => console.log("remove", member.id)}
              />
            ))}
          </div>
          <ChatRoomDangerActions onLeave={() => console.log("leave")} onDisband={() => console.log("disband")} />
        </div>
      </TestSection>
    </main>
  )
}
