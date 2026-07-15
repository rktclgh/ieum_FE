import { AuthGate } from "@/features/session/components/auth-gate"
import { NotificationsPageContent } from "@/features/notification/components/notifications-page-content"

export default function NotificationsPage() {
  return (
    <AuthGate policy="protected">
      <NotificationsPageContent />
    </AuthGate>
  )
}
