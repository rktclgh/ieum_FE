import { toWebPushSubscriptionRequest } from "@/features/notification/lib/web-push"
import { apiClient } from "@/lib/api/client"

import type { WebPushSubscriptionRequest } from "@/features/notification/lib/web-push"

interface WebPushConfig {
  enabled: boolean
  vapidPublicKey: string
  subscribed: boolean
}

interface WebPushRequestOptions {
  signal?: AbortSignal
}

async function getWebPushConfig(options: WebPushRequestOptions = {}) {
  const { data } = await apiClient.get<WebPushConfig>(
    "/api/v1/notifications/push/config",
    options,
  )
  return data
}

async function upsertWebPushSubscription(
  subscriptionJson: PushSubscriptionJSON,
  options: WebPushRequestOptions = {},
) {
  await apiClient.put(
    "/api/v1/notifications/push/subscription",
    toWebPushSubscriptionRequest(subscriptionJson),
    options,
  )
}

export { getWebPushConfig, upsertWebPushSubscription }
export type { WebPushConfig, WebPushRequestOptions, WebPushSubscriptionRequest }
