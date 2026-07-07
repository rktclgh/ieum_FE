import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { MyPageContent } from "@/features/my/components/my-page-content"
import { getMeServer } from "@/features/session/api/session-server-api"

export default async function MyPage() {
  const me = await getMeServer()
  if (!me) redirect("/login")

  const queryClient = new QueryClient()
  queryClient.setQueryData(["me"], me)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyPageContent />
    </HydrationBoundary>
  )
}
