import { AuthGate } from "@/features/session/components/auth-gate"

export default function QuestionsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate policy="protected">{children}</AuthGate>
}
