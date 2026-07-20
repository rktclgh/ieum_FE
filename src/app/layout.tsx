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
    /*
     * issue #381 — #304에서 "black-translucent"로 켰다가 되돌린다.
     *
     * black-translucent는 웹뷰를 상태바 뒤까지 끌어올려 `--safe-area-top`에 실제 노치
     * 높이를 넘겨준다. 그런데 iOS는 이때 레이아웃 뷰포트(ICB) 높이를 상태바를 뺀 옛 값
     * 그대로 둔다. 결과적으로 콘텐츠만 위로 당겨지고 **바닥에 상태바 높이만큼 공백**이
     * 남는다. `position: fixed`는 이 ICB를 기준으로 잡히므로, 홈 지도(`fixed inset-0`)와
     * 탭바(`fixed bottom-0`)가 나란히 화면 바닥에 못 닿고 그 위에서 끊긴다.
     *
     * "default"에서는 iOS가 상태바 영역을 직접 소유하고 웹뷰를 그 아래에서 시작시킨다.
     * ICB와 실제 그려지는 영역이 일치하므로 바닥 공백이 사라진다. 대신 상태바 뒤로
     * 배경을 흘려보내는 연출은 포기한다 — 상태바 영역은 iOS가 칠한다.
     *
     * `--safe-area-top`은 standalone에서 0px이 되지만, 이건 회귀가 아니라 정상이다.
     * 그 영역을 이미 iOS가 떼어 갔으므로 페이지가 추가로 피할 여백이 없다.
     * `APP_BAR_SAFE_TOP`은 `calc(1rem + var(--safe-area-top))`이라 0px이면 기본 16px로
     * 자연스럽게 수렴한다. Safari(브라우저 탭)에서는 종전대로 실제 노치 값이 들어온다.
     */
    statusBarStyle: "default",
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
