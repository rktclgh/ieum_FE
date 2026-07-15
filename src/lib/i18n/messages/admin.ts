interface AdminMessages {
  common: {
    loading: string
    loadError: string
    empty: string
    retry: string
    loadMore: string
    all: string
    save: string
    cancel: string
  }
  auth: {
    title: string
    description: string
    desktopOnly: string
    forbidden: string
    switchAccount: string
    email: string
    password: string
    submit: string
    loginError: string
  }
  navigation: {
    dashboard: string
    users: string
    reports: string
    inquiries: string
  }
  dashboard: {
    title: string
    range: (from: string, to: string) => string
    signup: string
    activeUsers: string
    suspendedUsers: string
    pins: string
    questions: string
    meetings: string
    answers: string
    acceptedRate: string
    messages: string
    reports: string
    aiReviewed: string
    confirmed: string
    dismissed: string
    sanctions: string
  }
  users: {
    title: string
    search: string
    status: string
    email: string
    nickname: string
    role: string
    grade: string
    provider: string
    lastActiveAt: string
    birthDate: string
    gender: string
    nationality: string
    profileImage: string
    detail: string
    activity: string
    questions: string
    answers: string
    accepted: string
    reported: string
    reports: string
    reporter: string
    messageId: string
    sanctions: string
    sanctionType: string
    temporary: string
    permanent: string
    reason: string
    createdAt: string
    createdBy: string
    endsAt: string
    releasedAt: string
    releasedBy: string
    sanction: string
    activate: string
    activationConfirm: string
    activationScopeNotice: string
    invalidReason: string
    invalidEndsAt: string
  }
  reports: {
    title: string
    status: string
    aiState: string
    decision: string
    target: string
    reporter: string
    reportedUser: string
    missingReportedUser: string
    reason: string
    createdAt: string
    detail: string
    evidence: string
    evidenceHash: string
    aiResult: string
    recommendation: string
    confidence: string
    reviewedAt: string
    modelVersion: string
    policyVersion: string
    policySetHash: string
    lastErrorCode: string
    resolution: string
    sanctions: string
    confirm: string
    dismiss: string
    confirmNotice: string
    resolvedConflict: string
  }
  inquiries: {
    title: string
    userEmail: string
    missingUser: string
    createdAt: string
    status: string
    content: string
    answer: string
    answeredBy: string
    answeredAt: string
    answerPlaceholder: string
    answerSubmit: string
    invalidAnswer: string
    answeredConflict: string
  }
}

const adminKo: AdminMessages = {
  common: {
    loading: "불러오는 중입니다.",
    loadError: "정보를 불러오지 못했습니다.",
    empty: "표시할 항목이 없습니다.",
    retry: "다시 시도",
    loadMore: "더 보기",
    all: "전체",
    save: "저장",
    cancel: "취소",
  },
  auth: {
    title: "운영자 로그인",
    description: "운영자 계정으로 로그인해 주세요.",
    desktopOnly: "운영자 화면은 1024px 이상의 데스크톱 환경에서 사용할 수 있습니다.",
    forbidden: "운영자 권한이 없는 계정입니다.",
    switchAccount: "다른 계정으로 로그인",
    email: "이메일",
    password: "비밀번호",
    submit: "로그인",
    loginError: "로그인에 실패했습니다. 계정 정보를 확인해 주세요.",
  },
  navigation: {
    dashboard: "대시보드",
    users: "회원",
    reports: "신고",
    inquiries: "문의",
  },
  dashboard: {
    title: "운영 현황",
    range: (from, to) => `${from} ~ ${to}`,
    signup: "신규 가입",
    activeUsers: "활성 회원",
    suspendedUsers: "기간 내 제재 회원",
    pins: "지도 핀",
    questions: "질문",
    meetings: "모임",
    answers: "답변",
    acceptedRate: "채택률",
    messages: "메시지",
    reports: "신고",
    aiReviewed: "AI 검토 완료",
    confirmed: "확정",
    dismissed: "기각",
    sanctions: "제재",
  },
  users: {
    title: "회원 관리",
    search: "이메일 또는 닉네임 검색",
    status: "상태",
    email: "이메일",
    nickname: "닉네임",
    role: "역할",
    grade: "등급",
    provider: "가입 방식",
    lastActiveAt: "최근 활동",
    birthDate: "생년월일",
    gender: "성별",
    nationality: "국적",
    profileImage: "프로필 이미지",
    detail: "회원 상세",
    activity: "활동 현황",
    questions: "질문 수",
    answers: "답변 수",
    accepted: "채택 수",
    reported: "신고받은 횟수",
    reports: "신고 내역",
    reporter: "신고자",
    messageId: "메시지 ID",
    sanctions: "제재 내역",
    sanctionType: "제재 유형",
    temporary: "일시 정지",
    permanent: "영구 정지",
    reason: "사유",
    createdAt: "처리 일시",
    createdBy: "처리 운영자",
    endsAt: "종료 일시",
    releasedAt: "해제 일시",
    releasedBy: "해제 운영자",
    sanction: "계정 제재",
    activate: "전체 제재 해제 및 계정 활성화",
    activationConfirm: "이 회원의 계정을 활성화하시겠습니까?",
    activationScopeNotice: "활성화하면 이 회원의 모든 미해제 제재가 함께 해제됩니다.",
    invalidReason: "사유를 1자 이상 500자 이하로 입력해 주세요.",
    invalidEndsAt: "일시 정지 종료 일시는 현재보다 이후여야 합니다.",
  },
  reports: {
    title: "신고 관리",
    status: "처리 상태",
    aiState: "AI 검토 상태",
    decision: "AI 권고",
    target: "신고 대상",
    reporter: "신고자",
    reportedUser: "신고 대상 회원",
    missingReportedUser: "대상 회원 없음",
    reason: "신고 사유",
    createdAt: "신고 일시",
    detail: "신고 상세",
    evidence: "근거 데이터",
    evidenceHash: "근거 해시",
    aiResult: "AI 검토 결과",
    recommendation: "권고 결과",
    confidence: "신뢰도",
    reviewedAt: "검토 일시",
    modelVersion: "모델 버전",
    policyVersion: "정책 버전",
    policySetHash: "정책 세트 해시",
    lastErrorCode: "최근 오류 코드",
    resolution: "처리 결과",
    sanctions: "관련 제재",
    confirm: "신고 확정",
    dismiss: "신고 기각",
    confirmNotice: "신고 확정은 신고 상태만 변경하며 새 제재를 만들지 않습니다.",
    resolvedConflict: "이미 처리되었거나 상태가 변경된 신고입니다. 최신 정보를 불러왔습니다.",
  },
  inquiries: {
    title: "문의 관리",
    userEmail: "문의 회원",
    missingUser: "회원 정보 없음",
    createdAt: "문의 일시",
    status: "처리 상태",
    content: "문의 내용",
    answer: "답변",
    answeredBy: "답변 운영자",
    answeredAt: "답변 일시",
    answerPlaceholder: "답변을 입력해 주세요.",
    answerSubmit: "답변 등록",
    invalidAnswer: "답변을 1자 이상 2000자 이하로 입력해 주세요.",
    answeredConflict: "이미 답변된 문의입니다. 서버의 최신 답변을 불러왔습니다.",
  },
}

const adminEn: AdminMessages = {
  common: {
    loading: "Loading.",
    loadError: "Unable to load the information.",
    empty: "There are no items to display.",
    retry: "Retry",
    loadMore: "Load more",
    all: "All",
    save: "Save",
    cancel: "Cancel",
  },
  auth: {
    title: "Administrator sign in",
    description: "Sign in with an administrator account.",
    desktopOnly: "The administrator dashboard requires a desktop viewport of at least 1024px.",
    forbidden: "This account does not have administrator access.",
    switchAccount: "Sign in with another account",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    loginError: "Sign-in failed. Check your account details and try again.",
  },
  navigation: {
    dashboard: "Dashboard",
    users: "Users",
    reports: "Reports",
    inquiries: "Inquiries",
  },
  dashboard: {
    title: "Operations overview",
    range: (from, to) => `${from} – ${to}`,
    signup: "New sign-ups",
    activeUsers: "Active users",
    suspendedUsers: "Users sanctioned in period",
    pins: "Map pins",
    questions: "Questions",
    meetings: "Meetings",
    answers: "Answers",
    acceptedRate: "Acceptance rate",
    messages: "Messages",
    reports: "Reports",
    aiReviewed: "AI reviewed",
    confirmed: "Confirmed",
    dismissed: "Dismissed",
    sanctions: "Sanctions",
  },
  users: {
    title: "User management",
    search: "Search by email or nickname",
    status: "Status",
    email: "Email",
    nickname: "Nickname",
    role: "Role",
    grade: "Grade",
    provider: "Provider",
    lastActiveAt: "Last active",
    birthDate: "Date of birth",
    gender: "Gender",
    nationality: "Nationality",
    profileImage: "Profile image",
    detail: "User details",
    activity: "Activity",
    questions: "Questions",
    answers: "Answers",
    accepted: "Accepted answers",
    reported: "Times reported",
    reports: "Report history",
    reporter: "Reporter",
    messageId: "Message ID",
    sanctions: "Sanction history",
    sanctionType: "Sanction type",
    temporary: "Temporary suspension",
    permanent: "Permanent suspension",
    reason: "Reason",
    createdAt: "Created at",
    createdBy: "Created by",
    endsAt: "Ends at",
    releasedAt: "Released at",
    releasedBy: "Released by",
    sanction: "Sanction account",
    activate: "Release all sanctions and activate account",
    activationConfirm: "Activate this user's account?",
    activationScopeNotice: "Activation also releases every unreleased sanction for this user.",
    invalidReason: "Enter a reason between 1 and 500 characters.",
    invalidEndsAt: "A temporary suspension must end in the future.",
  },
  reports: {
    title: "Report management",
    status: "Status",
    aiState: "AI review state",
    decision: "AI recommendation",
    target: "Target",
    reporter: "Reporter",
    reportedUser: "Reported user",
    missingReportedUser: "No reported user",
    reason: "Reason",
    createdAt: "Reported at",
    detail: "Report details",
    evidence: "Evidence",
    evidenceHash: "Evidence hash",
    aiResult: "AI review result",
    recommendation: "Recommendation",
    confidence: "Confidence",
    reviewedAt: "Reviewed at",
    modelVersion: "Model version",
    policyVersion: "Policy version",
    policySetHash: "Policy set hash",
    lastErrorCode: "Latest error code",
    resolution: "Resolution",
    sanctions: "Related sanctions",
    confirm: "Confirm report",
    dismiss: "Dismiss report",
    confirmNotice: "Confirming a report only changes its status and does not create a sanction.",
    resolvedConflict: "This report was already resolved or changed. The latest data is now displayed.",
  },
  inquiries: {
    title: "Inquiry management",
    userEmail: "User",
    missingUser: "User information unavailable",
    createdAt: "Submitted at",
    status: "Status",
    content: "Inquiry",
    answer: "Answer",
    answeredBy: "Answered by",
    answeredAt: "Answered at",
    answerPlaceholder: "Enter an answer.",
    answerSubmit: "Submit answer",
    invalidAnswer: "Enter an answer between 1 and 2000 characters.",
    answeredConflict: "This inquiry was already answered. The latest server answer is now displayed.",
  },
}

export { adminEn, adminKo }
export type { AdminMessages }
