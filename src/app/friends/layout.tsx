import { AuthGate } from "@/features/session/components/auth-gate"

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate policy="protected">{children}</AuthGate>
}
