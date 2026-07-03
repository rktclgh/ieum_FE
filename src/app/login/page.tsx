import { Apple, ChevronDown, MessageCircle } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center gap-6 px-4 py-4">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full bg-gray-50 py-1.5 pr-3 pl-2.5 text-body-regular-12 text-gray-900"
      >
        <ChevronDown className="size-5" />
        한국어
      </button>

      <div className="flex h-[120px] w-full items-center justify-center">
        <span className="text-[30px] font-medium text-black">로고</span>
      </div>

      <form className="flex w-full flex-col items-center gap-3">
        <Input type="email" name="email" autoComplete="email" placeholder="이메일 입력" />
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="비밀번호 입력"
        />
        <Button
          type="submit"
          className="h-12 w-full rounded-[12px] bg-primary-600 text-body-medium-14 text-white hover:bg-primary-700"
        >
          로그인
        </Button>
      </form>

      <div className="flex items-center justify-center gap-4">
        <span className="text-body-regular-12 text-gray-600">비밀번호 찾기</span>
        <span className="h-2 w-px bg-gray-200" />
        <span className="text-body-regular-12 text-gray-600">회원가입</span>
      </div>

      <div className="flex w-full items-center gap-2">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-body-medium-16 text-gray-400">or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full justify-center gap-3 rounded-[12px] border-gray-100 bg-gray-50 text-body-medium-14 text-gray-900 hover:bg-gray-100"
        >
          <Image src="/icons/google.svg" alt="" width={20} height={20} className="size-5" />
          구글로 로그인
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full justify-center gap-3 rounded-[12px] border-gray-100 bg-gray-50 text-body-medium-14 text-gray-900 hover:bg-gray-100"
        >
          <Apple className="size-5" />
          애플로 로그인
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full justify-center gap-3 rounded-[12px] border-gray-100 bg-gray-50 text-body-medium-14 text-gray-900 hover:bg-gray-100"
        >
          <MessageCircle className="size-5" />
          카카오로 로그인
        </Button>
      </div>
    </main>
  )
}
