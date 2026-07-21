import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "@/lib/query/query-provider";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { KeyboardInsetProvider } from "@/lib/viewport/keyboard-inset-provider";
import { StandaloneViewportExpander } from "@/lib/viewport/standalone-viewport-expander";
import { TabBar } from "@/features/navigation/components/tab-bar";
import "./globals.css";

const SITE_URL = "https://ieum.rktclgh.site";
const SITE_NAME = "이음";
const SITE_DESCRIPTION = "한국 생활을 잇는 외국인 커뮤니티";
const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} - ${SITE_DESCRIPTION}`,
};

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  appleWebApp: {
    capable: true,
    /*
     * ===== 상단 계약 스위치 — 이 앱의 레이아웃에서 가장 파급이 큰 한 줄 =====
     *
     * issue #419. **바꾸기 전에 `docs/viewport-behavior.md`를 읽을 것.**
     * 이 값은 #304→#381→#395→#409→#411로 다섯 번, 매번 실기기 측정 없이 한쪽 증상만 보고
     * 뒤집혔다. 이번(#419 edge-to-edge)에는 "후속 측정" 섹션의 실기기 검증을 근거로 정했다.
     *
     * "black-translucent" — standalone에서 지도가 상태바 뒤(top:0)까지 깔리는 유일한 길이다.
     * "default"는 iOS가 상단 62px을 소유해 지도가 그 아래에서만 그려지므로 상단 edge-to-edge가
     * 원천 불가능하다. 사용자가 상단까지 채우기를 명시적으로 요구해 black-translucent를 택했다.
     *
     * black-translucent의 알려진 함정과 이번 해법:
     *
     *   - 뷰포트가 812↔874로 흔들린다(변동폭 62px=상태바). `fixed bottom:0`은 이 흔들림을 따라가
     *     하단 요소가 62px 위아래로 튄다 → 과거 5번의 실패 원인.
     *     **해법**: 하단 고정 요소를 흔들리는 `bottom:0`(ICB)이 아니라 안정적인 `100lvh` floor에
     *     앵커한다. 탭바=`.bottom-anchor`(top:calc(100lvh−H)), 높이 가변 바=`.bottom-anchor-auto`
     *     (translateY(100lvh−100dvh)). 둘 다 실기기로 고정 확인(globals.css, viewport-behavior.md).
     *   - 812 상태에서 하단 62px이 뷰포트 밖이라 `fixed inset-0` 아래 죽은 띠가 남는다.
     *     **해법**: 전면 화면(`[data-screen=bleed|fixed]`)을 `height:100lvh`로 채운다(globals.css).
     *   - 상태바 글자가 앱 전역에서 흰색이 된다(탭별 분기 불가). 지도·어두운 화면은 정상,
     *     밝은 배경 화면(마이·질문 등)은 가독성이 떨어질 수 있으나 **의도된 트레이드오프**로 수용했다.
     *
     * `--safe-area-top`이 standalone에서 62px로 들어온다(default의 0px과 다름). `APP_BAR_SAFE_TOP`
     * = `calc(1rem + var(--safe-area-top))`이 그만큼 콘텐츠를 상태바 아래로 민다. 사파리 탭은 종전대로.
     */
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
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
  /*
   * 가상 키보드가 뜨면 **레이아웃 뷰포트 자체를 키보드 위로 줄인다**(기본값 resizes-visual이 아니라).
   *
   * 기본 resizes-visual에서는 키보드가 visual viewport만 줄이고 layout viewport(=`position: fixed`
   * 기준)는 그대로다. 그러면 iOS는 포커스된 입력창을 보이려 문서를 강제 스크롤하는데, 키보드가
   * 열린 동안 iOS는 `fixed`를 문서와 함께 끌어올려 화면 상단 고정 요소가 위로 사라진다.
   * 증상 두 가지가 같은 뿌리였다: 채팅방 상단 AppBar가 키보드만큼 밀려 올라가고(카카오톡은 고정),
   * 홈 지도 위 질문 바텀시트가 키보드 아래로 숨는다.
   *
   * resizes-content는 키보드가 layout viewport를 줄이므로 `fixed inset-0` 셸과 `fixed bottom` 시트가
   * 키보드 위 영역으로 함께 축소된다 — AppBar는 최상단에 고정되고 시트는 키보드 바로 위에 뜬다.
   *
   * `--keyboard-inset`(use-keyboard-inset.ts)과 base-ui의 `--drawer-keyboard-inset`은
   * "layout − visual" 간격을 재는데, resizes-content가 그 간격을 0으로 만들어 관련 `pb-[...]`
   * 보정이 자연히 무해한 0으로 degrade한다(이중 보정 없음). interactive-widget 미지원 브라우저는
   * 이 값을 무시하고 종전 resizes-visual 경로를 그대로 타므로 점진적 개선이다.
   */
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <head>
        {/*
         * standalone(홈 화면 추가 PWA) 여부를 첫 페인트 전에 `<html data-standalone>`으로 심는다.
         * 하단 고정 요소의 앵커 방식이 모드에 따라 갈리기 때문이다(globals.css의 `.bottom-anchor`,
         * docs/viewport-behavior.md). `@media (display-mode: standalone)`은 iOS standalone에서
         * 매칭되지 않으므로(실측) CSS로 분기할 수 없어 JS로 `navigator.standalone`을 읽는다.
         * 인라인 스크립트라 하이드레이션 전에 실행돼 앵커가 어긋난 첫 프레임(FOUC)이 없다.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;if(s)document.documentElement.setAttribute('data-standalone','');}catch(e){}})()",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <KeyboardInsetProvider />
        <StandaloneViewportExpander />
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
