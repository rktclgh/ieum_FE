"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useReconcileWebPushSubscription } from "@/features/notification/hooks/use-web-push-subscription";
import { useMe } from "@/features/session/hooks/use-me";
import { resetSessionCache } from "@/features/session/lib/session-cache";
import { subscribeSessionExpired } from "@/features/session/lib/session-events";
import { shouldSyncServerLanguage } from "@/lib/i18n/language-sync";
import { useLanguageStore } from "@/lib/i18n/store";
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

function LanguageSessionSync() {
  const { data: user } = useMe();
  const serverLanguage = user?.settings.language;
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  useEffect(() => {
    if (!shouldSyncServerLanguage(language, serverLanguage)) return;
    setLanguage(serverLanguage);
  }, [language, serverLanguage, setLanguage]);

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
      <LanguageSessionSync />
      <WebPushSessionReconciler />
      {children}
    </QueryClientProvider>
  );
}
