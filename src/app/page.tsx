import Image from "next/image"

import { AppBar } from "@/components/ui/app-bar"
import { Circle } from "@/components/ui/circle"
import { Chip } from "@/components/ui/chip"
import { SearchBox } from "@/components/ui/search-box"
import { ChoicePill } from "@/components/ui/text-field/choice-pill"
import { Input } from "@/components/ui/text-field/input"
import { InputWithButton } from "@/components/ui/text-field/input-with-button"
import { PasswordInput } from "@/components/ui/text-field/password-input"
import { SelectInput } from "@/components/ui/text-field/select-input"
import { TabBar } from "@/features/navigation/components/tab-bar"

export default function Home() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4 pb-28">
        <h1 className="text-title-semibold-18">AppBar 컴포넌트 예시</h1>
        <div className="flex flex-col gap-2">
          <AppBar title="Label" className="rounded-2xl bg-white" />
          <AppBar title="정보 입력" trailingVariant="close" className="rounded-2xl bg-white" />
          <AppBar title="회원가입" leadingIcon={null} className="rounded-2xl bg-white" />
          <AppBar
            center={<span className="text-title-semibold-18 text-primary-600">LOGO</span>}
            trailingIcon={null}
            className="rounded-2xl bg-white"
          />
        </div>

        <h1 className="text-title-semibold-18">Input 컴포넌트 예시</h1>
        <div className="flex flex-col gap-2">
          <Input placeholder="Label" />
          <Input defaultValue="Label" readOnly />
          <Input defaultValue="Label" error readOnly />
        </div>

        <h1 className="text-title-semibold-18">PasswordInput 컴포넌트 예시</h1>
        <div className="flex flex-col gap-2">
          <PasswordInput placeholder="Label" />
          <PasswordInput defaultValue="password123" />
          <PasswordInput defaultValue="password123" error />
        </div>

        <h1 className="text-title-semibold-18">SelectInput 컴포넌트 예시</h1>
        <div className="flex flex-col gap-2">
          <SelectInput
            placeholder="Label"
            options={[
              { value: "option1", label: "옵션 1" },
              { value: "option2", label: "옵션 2" },
            ]}
          />
          <SelectInput
            defaultValue="option1"
            options={[
              { value: "option1", label: "옵션 1" },
              { value: "option2", label: "옵션 2" },
            ]}
          />
        </div>

        <h1 className="text-title-semibold-18">InputWithButton 컴포넌트 예시</h1>
        <div className="flex flex-col gap-2">
          <InputWithButton placeholder="Label" buttonLabel="중복확인" />
          <InputWithButton defaultValue="Label" buttonLabel="중복확인" />
          <InputWithButton defaultValue="Label" buttonLabel="중복확인" error />
        </div>

        <h1 className="text-title-semibold-18">ChoicePill 컴포넌트 예시</h1>
        <div className="flex gap-2">
          <ChoicePill label="남성" selected={false} className="flex-1" />
          <ChoicePill label="여성" selected className="flex-1" />
        </div>

        <h1 className="text-title-semibold-18">SearchBox 컴포넌트 예시</h1>
        <div className="flex flex-col gap-2">
          <SearchBox placeholder="지역, 모임, 질문 검색" />
          <SearchBox defaultValue="강남구 모임" placeholder="지역, 모임, 질문 검색" />
          <div className="flex items-center gap-2">
            <SearchBox className="w-72" placeholder="지역, 모임, 질문 검색" />
            <Circle iconSrc="/icons/circle/location.svg" />
          </div>
        </div>

        <h1 className="text-title-semibold-18">Chip 컴포넌트 예시</h1>
        <div className="flex gap-2">
          <Chip selected>전체</Chip>
          <Chip>모임</Chip>
          <Chip>질문</Chip>
        </div>

        <h1 className="text-title-semibold-18">Circle 컴포넌트 예시</h1>
        <div className="flex gap-2">
          <Circle iconSrc="/icons/circle/alarm.svg" />
          <Circle iconSrc="/icons/circle/alarm-on.svg" />
          <Circle iconSrc="/icons/circle/location.svg" />
          <Circle iconSrc="/icons/circle/list.svg" />
          <Circle iconSrc="/icons/circle/plus.svg" />
          <Circle background="primary" iconSrc="/icons/circle/plus-white.svg" />
          <Circle iconSrc="/icons/circle/add-friend.svg" />
        </div>

        <h1 className="text-title-semibold-18">Arrow 아이콘 예시</h1>
        <div className="flex gap-2">
          <Image src="/icons/arrow/up.svg" alt="up" width={24} height={24} />
          <Image src="/icons/arrow/down.svg" alt="down" width={24} height={24} />
          <Image src="/icons/arrow/left.svg" alt="left" width={24} height={24} />
          <Image src="/icons/arrow/right.svg" alt="right" width={24} height={24} />
        </div>

        <h1 className="text-title-semibold-18">TabBar 컴포넌트 예시</h1>
        <p className="text-body-regular-12 text-gray-500">
          탭별 활성 상태 미리보기 (화면 하단 고정 예시는 아래에 있습니다.)
        </p>
        <div className="flex flex-col gap-2">
          <TabBar activeHref="/" className="w-auto p-0" />
          <TabBar activeHref="/chats" className="w-auto p-0" />
          <TabBar activeHref="/questions" className="w-auto p-0" />
          <TabBar activeHref="/my" className="w-auto p-0" />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm">
        <TabBar />
      </div>
    </>
  )
}
