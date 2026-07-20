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
     * issue #395 — #304에서 켰다가 #381에서 되돌렸던 값을, 하단 공백 대책과 함께 다시 켠다.
     *
     * 왜 다시 켜는가: "default"는 iOS가 상태바 영역을 직접 소유하고 웹뷰를 그 아래에서
     * 시작시킨다. 그래서 그 영역에는 우리 콘텐츠가 절대 그려질 수 없고, 홈 지도가 화면
     * 끝까지 차지 못한 채 빈 회색 띠가 남는다(#395). black-translucent만이 웹뷰를 상태바
     * 뒤까지 끌어올린다.
     *
     * #381이 되돌린 이유(하단 공백): iOS는 웹뷰를 위로 끌어올리면서도 레이아웃 뷰포트(ICB)
     * 높이는 상태바를 뺀 옛 값 그대로 둔다. `position: fixed`가 이 ICB 기준이라, 홈 지도와
     * 탭바가 나란히 화면 바닥에 못 닿고 상태바 높이만큼 위에서 끊긴다.
     *
     * 이번 대책: 그 부족분을 `--icb-shortfall`(globals.css)로 이름 붙이고, 화면을 꽉 채우는
     * 셸과 하단 고정 바가 `app-screen-fixed` / `app-bottom-fixed` 유틸리티로 그만큼 아래까지
     * 뻗도록 했다. 값은 `@media (display-mode: standalone)`에서만 살아나므로 사파리 탭·
     * 데스크톱 동작은 종전 그대로다.
     *
     * `--safe-area-top`은 여기서 실제 노치 높이로 돌아온다. 상단 safe-area를 쓰는 화면들이
     * 이 값에 의존하므로(`APP_BAR_SAFE_TOP` 등) 이 설정을 다시 건드릴 때는 상·하단을 함께 볼 것.
     */
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
