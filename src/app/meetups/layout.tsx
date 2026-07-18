import { AuthGate } from "@/features/session/components/auth-gate"

export default function MeetupsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate policy="protected">{children}</AuthGate>
}
