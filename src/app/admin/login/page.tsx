import { AdminGate } from "@/features/admin/auth/components/admin-gate"
import { AdminLoginPage } from "@/features/admin/auth/components/admin-login-page"
import { AdminDesktopBoundary } from "@/features/admin/shared/components/admin-desktop-boundary"

export default function AdminLoginRoute() {
  return (
    <AdminGate policy="login">
      <AdminDesktopBoundary>
        <AdminLoginPage />
      </AdminDesktopBoundary>
    </AdminGate>
  )
}
