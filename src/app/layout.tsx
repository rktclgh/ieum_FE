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
     * ===== 상단 계약 스위치 — 이 앱의 레이아웃에서 가장 파급이 큰 한 줄 =====
     *
     * issue #419. **바꾸기 전에 `docs/viewport-behavior.md`를 읽을 것.**
     * 이 값은 #304→#381→#395→#409→#411로 다섯 번 뒤집혔고, 매번 실기기 측정 없이
     * 한쪽 증상만 보고 뒤집혔다. 이번에는 재고 정했다.
     *
     * "black-translucent"를 쓰지 않는 이유 (iPhone 16 Pro / iOS 18.7 standalone 실측):
     *
     *   - 뷰포트 높이가 812↔874로 흔들린다. 로드 직후 812, 첫 스크롤 이후 874.
     *     변동폭 62px은 정확히 상태바 높이다.
     *   - `position: fixed`는 이 흔들리는 뷰포트를 따라간다. 그래서 하단 탭바가
     *     스크롤에 따라 62px 위아래로 움직인다 — "항상 같은 위치"가 성립하지 않는다.
     *   - 812 상태에서는 화면 하단 62px이 아예 뷰포트 밖이라 CSS로 칠할 수 없다.
     *     홈 지도는 스크롤이 없어 이 상태에 고정되므로, edge-to-edge를 가장 원하는
     *     화면에서 오히려 하단에 죽은 띠가 상시로 남는다.
     *
     * 즉 값을 잘 맞추면 되는 문제가 아니라 구조적 비호환이다. #381(하단 공백)과
     * #414(이미 꽉 참)는 **둘 다 맞았다** — 서로 다른 상태를 봤을 뿐이다.
     *
     * "default"에서는 `innerHeight = ICB = 100dvh = 100% = 812`로 전부 일치하고 흔들리지
     * 않는다. 대가는 상단 62px을 iOS가 소유하는 것이다. 지도는 그 아래까지만 그려진다.
     *
     * standalone에서 `--safe-area-top`이 0px이 되는 것은 회귀가 아니라 정상이다. 그 영역을
     * iOS가 떼어 갔으므로 페이지가 추가로 피할 여백이 없다. `APP_BAR_SAFE_TOP`은
     * `calc(1rem + var(--safe-area-top))`이라 0px이면 기본 16px로 수렴한다.
     * 사파리 탭에서는 종전대로 실제 노치 값이 들어온다.
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
