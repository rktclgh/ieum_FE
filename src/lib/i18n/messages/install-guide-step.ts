// 안내 문구 중간에 iOS 버튼 아이콘이 들어가야 해서 단계를 통짜 문자열로 둘 수 없다.
// 카탈로그는 아이콘을 문자열 키로만 알고, 실제 컴포넌트 매핑은 렌더 쪽이 갖는다.
type InstallGuideIcon = "ellipsis" | "share" | "square-plus"
type InstallGuideStepPart = string | { icon: InstallGuideIcon }
type InstallGuideStep = InstallGuideStepPart[]

export type { InstallGuideIcon, InstallGuideStepPart, InstallGuideStep }
