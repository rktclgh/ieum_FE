import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "@/lib/query/query-provider";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { RequireAuthProvider } from "@/features/session/components/require-auth-provider";
import "./globals.css";


const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ieum",
  description: "이음",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ieum",
  },
  icons: {
    icon: [
      { url: "/icons/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <QueryProvider>
            <RequireAuthProvider>{children}</RequireAuthProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
