import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "@/lib/query/query-provider";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { KeyboardInsetProvider } from "@/lib/viewport/keyboard-inset-provider";
import { TabBar } from "@/features/navigation/components/tab-bar";
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
    // issue #304 — `viewportFit: "cover"`(아래)와 한 쌍이다.
    // iOS standalone 웹앱에서 이 값이 "default"면 웹뷰가 상태바 *아래에서* 시작한다.
    // 상태바 영역을 iOS가 소유해 페이지에 넘겨주지 않으므로 cover를 켜도
    // `--safe-area-top`이 0px으로 잡히고 상단만 edge-to-edge가 되지 않는다.
    // "black-translucent"라야 웹뷰가 상태바 뒤까지 차지하고 실제 노치 높이가 나온다.
    statusBarStyle: "black-translucent",
    title: "Ieum",
  },
  // 파비콘/터치 아이콘은 app/ 파일 컨벤션(favicon.ico, icon.svg, apple-icon.png)이 처리한다.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fc7045",
  // issue #279 — 상태바·홈 인디케이터 영역까지 앱이 그려지는 edge-to-edge.
  // 이게 있어야 globals.css의 `--safe-area-*`(env(safe-area-inset-*))가 0px이 아닌 실제 값이 된다.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <KeyboardInsetProvider />
        <I18nProvider>
          <QueryProvider>
            {children}
            {/* 라우트 전환 중에도 인스턴스를 유지해야 pill이 미끄러진다 (issue #280) */}
            <TabBar />
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
