"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { LogoutButton } from "@/features/session/components/logout-button"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { messages } = useTranslation()
  const navigation = [
    { href: routes.adminHome(), label: messages.admin.navigation.dashboard },
    { href: routes.adminUsers(), label: messages.admin.navigation.users },
    { href: routes.adminReports(), label: messages.admin.navigation.reports },
    { href: routes.adminInquiries(), label: messages.admin.navigation.inquiries },
  ]

  return (
    <div className="flex min-h-dvh w-full bg-gray-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white px-5 py-6">
        <p className="mb-8 text-title-bold-20 text-gray-900">
          {messages.admin.dashboard.title}
        </p>
        <nav aria-label={messages.admin.dashboard.title} className="flex flex-1 flex-col gap-2">
          {navigation.map((item) => {
            const isCurrent =
              item.href === routes.adminHome()
                ? pathname === item.href
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className="rounded-lg px-3 py-2.5 text-body-medium-15 text-gray-700 transition-colors hover:bg-gray-50 aria-[current=page]:bg-primary-50 aria-[current=page]:text-primary-700"
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <LogoutButton />
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  )
}

export { AdminShell }
