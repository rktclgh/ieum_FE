import { AuthGate } from "@/features/session/components/auth-gate"
import { HomeMapScreen } from "@/features/map/components/home-map-screen"

export default function Home() {
  return (
    <AuthGate policy="protected">
      <HomeMapScreen />
    </AuthGate>
  )
}
