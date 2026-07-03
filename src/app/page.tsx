import { Input } from "@/components/ui/input"

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4">
      <h1 className="text-title-semibold-18">Input 컴포넌트 예시</h1>
      <Input defaultValue="Label" readOnly />
      <Input placeholder="Label" />
    </main>
  )
}
