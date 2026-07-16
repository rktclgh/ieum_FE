"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useReconcileWebPushSubscription } from "@/features/notification/hooks/use-web-push-subscription";
import { useMe } from "@/features/session/hooks/use-me";
import { resetSessionCache } from "@/features/session/lib/session-cache";
import { subscribeSessionExpired } from "@/features/session/lib/session-events";
import { makeQueryClient } from "./query-client";

let browserQueryClient: QueryClient | undefined;

function WebPushSessionReconciler() {
  const { data: user } = useMe();

  useReconcileWebPushSubscription({
    userId: user?.userId,
    notifyAll: user?.settings.notifyAll,
  });

  return null;
}

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: reuse the same client across renders
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  useEffect(
    () =>
      subscribeSessionExpired(() => {
        void resetSessionCache(queryClient).catch((error) => {
          console.error("Failed to reset session cache", error);
        });
      }),
    [queryClient]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WebPushSessionReconciler />
      {children}
    </QueryClientProvider>
  );
}
