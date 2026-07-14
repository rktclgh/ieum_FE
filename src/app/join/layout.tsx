import { AuthGate } from "@/features/session/components/auth-gate"

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate policy="guest-only">{children}</AuthGate>
}
