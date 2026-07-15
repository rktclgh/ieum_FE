import type * as React from "react"

import { AdminGate } from "@/features/admin/auth/components/admin-gate"
import { AdminDesktopBoundary } from "@/features/admin/shared/components/admin-desktop-boundary"
import { AdminShell } from "@/features/admin/shared/components/admin-shell"

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGate policy="protected">
      <AdminDesktopBoundary>
        <AdminShell>{children}</AdminShell>
      </AdminDesktopBoundary>
    </AdminGate>
  )
}
