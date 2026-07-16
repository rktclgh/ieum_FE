import { toWebPushSubscriptionRequest } from "@/features/notification/lib/web-push"
import { apiClient } from "@/lib/api/client"

import type { WebPushSubscriptionRequest } from "@/features/notification/lib/web-push"

interface WebPushConfig {
  enabled: boolean
  vapidPublicKey: string
  subscribed: boolean
}

async function getWebPushConfig() {
  const { data } = await apiClient.get<WebPushConfig>(
    "/api/v1/notifications/push/config",
  )
  return data
}

async function upsertWebPushSubscription(
  subscriptionJson: PushSubscriptionJSON,
) {
  await apiClient.put(
    "/api/v1/notifications/push/subscription",
    toWebPushSubscriptionRequest(subscriptionJson),
  )
}

export { getWebPushConfig, upsertWebPushSubscription }
export type { WebPushConfig, WebPushSubscriptionRequest }
