import type { NextConfig } from "next";

import { API_BASE_URL } from "./src/lib/api/config"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ]
  },
  async rewrites() {
    // 지도 프록시(/api/places/*)와 도메인 API(/api/v1/*)를 모두 Spring으로 보낸다.
    // 정적 export 전환(청크2) 시 dev 조건부로 감쌀 예정.
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
