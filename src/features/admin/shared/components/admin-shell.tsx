"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { LogoutButton } from "@/features/session/components/logout-button"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function isAdminNavCurrent(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === routes.adminHome()) return false
  if (href === routes.adminKnowledge()) {
    return pathname.startsWith(href) && !pathname.startsWith(routes.adminKnowledgeGraph())
  }

  return pathname.startsWith(href)
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { messages } = useTranslation()
  const navigationGroups = [
    {
      label: messages.admin.navigation.operations,
      items: [
        { href: routes.adminHome(), label: messages.admin.navigation.dashboard },
        { href: routes.adminUsers(), label: messages.admin.navigation.users },
      ],
    },
    {
      label: messages.admin.navigation.review,
      items: [
        { href: routes.adminReports(), label: messages.admin.navigation.reports },
        { href: routes.adminInquiries(), label: messages.admin.navigation.inquiries },
        { href: routes.adminContent(), label: messages.admin.navigation.content },
        { href: routes.adminKnowledge(), label: messages.admin.navigation.knowledge },
        { href: routes.adminKnowledgeGraph(), label: messages.admin.navigation.knowledgeGraph },
      ],
    },
  ]

  return (
    <div className="flex min-h-dvh w-full bg-gray-50">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white px-5 py-6">
        <p className="mb-8 text-title-bold-20 text-gray-900">
          {messages.admin.dashboard.title}
        </p>
        <nav aria-label={messages.admin.dashboard.title} className="flex flex-1 flex-col gap-5">
          {navigationGroups.map((group) => (
            <section key={group.label} className="space-y-2">
              <h2 className="px-3 text-body-medium-12 text-gray-500">{group.label}</h2>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isCurrent = isAdminNavCurrent(pathname, item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isCurrent ? "page" : undefined}
                      className="rounded-lg px-3 py-2.5 text-body-medium-15 text-gray-700 transition-colors hover:bg-gray-50 aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </main>
    </div>
  )
}

export { AdminShell }
