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
    operations: string
    review: string
    dashboard: string
    users: string
    reports: string
    inquiries: string
    content: string
    knowledge: string
    knowledgeGraph: string
  }
  dashboard: {
    title: string
    range: (from: string, to: string) => string
    days: (days: number) => string
    from: string
    to: string
    applyRange: string
    invalidRange: string
    cachedError: string
    pendingReports: string
    retryReports: string
    deadReports: string
    pendingInquiries: string
    signup: string
    activeUsers: string
    suspendedUsers: string
    questions: string
    answers: string
    accepted: string
    acceptedRate: string
    reports: string
    aiReviewed: string
    confirmed: string
    dismissed: string
    sanctions: string
    userTrend: string
    contentTrend: string
    reportTrend: string
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
    deleted: string
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
    convergenceError: string
    resolutionDecision: string
    resolvedBy: string
    resolvedAt: string
    sanctionSource: string
    sanctionType: string
    sanctionReason: string
    sanctionAdmin: string
    sanctionStartsAt: string
    sanctionEndsAt: string
    sanctionReleasedAt: string
    sanctionReleasedBy: string
    sanctionCreatedAt: string
  }
  inquiries: {
    title: string
    userEmail: string
    missingUser: string
    createdAt: string
    status: string
    pending: string
    answered: string
    subject: string
    content: string
    answer: string
    answeredBy: string
    answeredAt: string
    answerPlaceholder: string
    answerSubmit: string
    invalidAnswer: string
    answeredConflict: string
    convergenceError: string
  }
  content: {
    title: string
    description: string
    type: string
    question: string
    meeting: string
    contentId: string
    invalidId: string
    loadPreview: string
    preview: string
    author: string
    createdAt: string
    deletedAt: string
    notDeleted: string
    requiredToken: string
    confirmation: string
    hardDelete: string
  }
  knowledge: {
    title: string
    status: string
    subject: string
    predicate: string
    object: string
    source: string
    confidence: string
    createdAt: string
    updatedAt: string
    detail: string
    backToList: string
    context: string
    version: string
    sourceStatus: string
    validUntil: string
    questionId: string
    answerId: string
    questionTitle: string
    questionContent: string
    answerContent: string
    chunkContent: string
    extractionProvider: string
    extractionModel: string
    reviewer: string
    reviewedAt: string
    reviewNote: string
    promotionRelation: string
    evidence: string
    chunk: string
    sourceEligibility: string
    eligible: string
    notEligible: string
    relation: string
    sameSourceRelations: string
    review: string
    rejectReason: string
    approve: string
    reject: string
    conflictRefreshed: string
    convergenceError: string
    graphTitle: string
    graphDescription: string
    graphSearch: string
    graphQuery: string
    graphQueryPlaceholder: string
    resetFilters: string
    showWholeGraph: string
    graphContext: string
    focusNode: string
    nodes: string
    edges: string
    zoom: string
    graphCanvas: string
    truncatedGraph: string
    emptyGraph: string
    inspector: string
    selectEdgeHint: string
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
    operations: "운영",
    review: "심사",
    dashboard: "대시보드",
    users: "회원",
    reports: "신고",
    inquiries: "문의",
    content: "콘텐츠 삭제",
    knowledge: "지식",
    knowledgeGraph: "지식 그래프",
  },
  dashboard: {
    title: "운영 현황",
    range: (from, to) => `${from} ~ ${to}`,
    days: (days) => `${days}일`,
    from: "시작일",
    to: "종료일",
    applyRange: "적용",
    invalidRange: "시작일은 종료일보다 늦을 수 없습니다.",
    cachedError: "최신 지표를 불러오지 못해 이전 데이터를 표시합니다.",
    pendingReports: "대기 중 신고",
    retryReports: "재시도 신고",
    deadReports: "실패 신고",
    pendingInquiries: "대기 중 문의",
    signup: "신규 가입",
    activeUsers: "활성 회원",
    suspendedUsers: "기간 내 제재 회원",
    questions: "질문",
    answers: "답변",
    accepted: "채택 답변",
    acceptedRate: "채택률",
    reports: "신고",
    aiReviewed: "AI 검토 완료",
    confirmed: "확정",
    dismissed: "기각",
    sanctions: "제재",
    userTrend: "회원 추이",
    contentTrend: "콘텐츠 추이",
    reportTrend: "신고 처리 추이",
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
    deleted: "삭제됨",
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
    convergenceError: "최신 처리 상태를 확인하지 못했습니다.",
    resolutionDecision: "처리 결과",
    resolvedBy: "처리 운영자",
    resolvedAt: "처리 일시",
    sanctionSource: "결정 출처",
    sanctionType: "제재 유형",
    sanctionReason: "제재 사유",
    sanctionAdmin: "제재 운영자",
    sanctionStartsAt: "시작 일시",
    sanctionEndsAt: "종료 일시",
    sanctionReleasedAt: "해제 일시",
    sanctionReleasedBy: "해제 운영자",
    sanctionCreatedAt: "제재 생성 일시",
  },
  inquiries: {
    title: "문의 관리",
    userEmail: "문의 회원",
    missingUser: "회원 정보 없음",
    createdAt: "문의 일시",
    status: "처리 상태",
    pending: "답변 대기",
    answered: "답변 완료",
    subject: "문의 제목",
    content: "문의 내용",
    answer: "답변",
    answeredBy: "답변 운영자",
    answeredAt: "답변 일시",
    answerPlaceholder: "답변을 입력해 주세요.",
    answerSubmit: "답변 등록",
    invalidAnswer: "답변을 1자 이상 2000자 이하로 입력해 주세요.",
    answeredConflict: "이미 답변된 문의입니다. 서버의 최신 답변을 불러왔습니다.",
    convergenceError: "서버의 최신 문의 상태를 확인하지 못했습니다.",
  },
  content: {
    title: "콘텐츠 영구 삭제",
    description: "질문 또는 모임 ID 하나를 조회한 뒤 확인 문구가 정확히 일치할 때만 영구 삭제합니다.",
    type: "콘텐츠 유형",
    question: "질문",
    meeting: "모임",
    contentId: "콘텐츠 ID",
    invalidId: "1 이상의 정수 ID를 입력해 주세요.",
    loadPreview: "미리보기 불러오기",
    preview: "삭제 대상",
    author: "작성자",
    createdAt: "생성일",
    deletedAt: "소프트 삭제일",
    notDeleted: "삭제되지 않음",
    requiredToken: "아래 확인 문구를 정확히 입력해야 합니다.",
    confirmation: "확인 문구",
    hardDelete: "영구 삭제",
  },
  knowledge: {
    title: "지식 후보 검토",
    status: "상태",
    subject: "주어",
    predicate: "관계",
    object: "목적어",
    source: "출처",
    confidence: "신뢰도",
    createdAt: "생성 일시",
    updatedAt: "수정 일시",
    detail: "후보 상세",
    backToList: "목록으로",
    context: "후보 맥락",
    version: "버전",
    sourceStatus: "출처 상태",
    validUntil: "유효 기한",
    questionId: "질문 ID",
    answerId: "답변 ID",
    questionTitle: "질문 제목",
    questionContent: "질문 내용",
    answerContent: "답변 내용",
    chunkContent: "청크 내용",
    extractionProvider: "추출 제공자",
    extractionModel: "추출 모델",
    reviewer: "검토 운영자",
    reviewedAt: "검토 일시",
    reviewNote: "검토 메모",
    promotionRelation: "승격 관계",
    evidence: "근거 문장",
    chunk: "근거 청크",
    sourceEligibility: "출처 적격성",
    eligible: "적격",
    notEligible: "부적격",
    relation: "관계 편집",
    sameSourceRelations: "같은 출처 관계",
    review: "검토",
    rejectReason: "반려 사유",
    approve: "승인",
    reject: "반려",
    conflictRefreshed: "이미 처리되었거나 상태가 변경된 후보입니다. 최신 정보를 불러왔습니다.",
    convergenceError: "최신 후보 상태를 확인하지 못했습니다.",
    graphTitle: "지식 그래프",
    graphDescription: "승인된 개념과 관계를 검색하고 근거를 확인합니다.",
    graphSearch: "검색과 필터",
    graphQuery: "개념 검색",
    graphQueryPlaceholder: "주어 또는 목적어",
    resetFilters: "초기화",
    showWholeGraph: "전체 보기",
    graphContext: "그래프 범위",
    focusNode: "중심 노드",
    nodes: "노드",
    edges: "엣지",
    zoom: "확대",
    graphCanvas: "개념 그래프",
    truncatedGraph: "결과가 잘렸습니다. 검색하거나 노드를 선택해 범위를 좁혀 주세요.",
    emptyGraph: "표시할 관계가 없습니다. 검색어나 필터를 조정해 주세요.",
    inspector: "관계 근거",
    selectEdgeHint: "그래프의 관계선을 선택하면 신뢰도, 출처, 근거 문장이 표시됩니다.",
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
    operations: "Operations",
    review: "Review",
    dashboard: "Dashboard",
    users: "Users",
    reports: "Reports",
    inquiries: "Inquiries",
    content: "Content deletion",
    knowledge: "Knowledge",
    knowledgeGraph: "Knowledge graph",
  },
  dashboard: {
    title: "Operations overview",
    range: (from, to) => `${from} – ${to}`,
    days: (days) => `${days} days`,
    from: "From",
    to: "To",
    applyRange: "Apply",
    invalidRange: "The start date cannot be after the end date.",
    cachedError: "Unable to load fresh metrics. Showing the previous data.",
    pendingReports: "Pending reports",
    retryReports: "Retry reports",
    deadReports: "Failed reports",
    pendingInquiries: "Pending inquiries",
    signup: "New sign-ups",
    activeUsers: "Active users",
    suspendedUsers: "Users sanctioned in period",
    questions: "Questions",
    answers: "Answers",
    accepted: "Accepted answers",
    acceptedRate: "Acceptance rate",
    reports: "Reports",
    aiReviewed: "AI reviewed",
    confirmed: "Confirmed",
    dismissed: "Dismissed",
    sanctions: "Sanctions",
    userTrend: "User trend",
    contentTrend: "Content trend",
    reportTrend: "Report handling trend",
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
    deleted: "Deleted",
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
    convergenceError: "Could not verify the latest processing state.",
    resolutionDecision: "Resolution",
    resolvedBy: "Resolved by",
    resolvedAt: "Resolved at",
    sanctionSource: "Decision source",
    sanctionType: "Sanction type",
    sanctionReason: "Sanction reason",
    sanctionAdmin: "Sanction administrator",
    sanctionStartsAt: "Starts at",
    sanctionEndsAt: "Ends at",
    sanctionReleasedAt: "Released at",
    sanctionReleasedBy: "Released by",
    sanctionCreatedAt: "Sanction created at",
  },
  inquiries: {
    title: "Inquiry management",
    userEmail: "User",
    missingUser: "User information unavailable",
    createdAt: "Submitted at",
    status: "Status",
    pending: "Pending",
    answered: "Answered",
    subject: "Subject",
    content: "Inquiry",
    answer: "Answer",
    answeredBy: "Answered by",
    answeredAt: "Answered at",
    answerPlaceholder: "Enter an answer.",
    answerSubmit: "Submit answer",
    invalidAnswer: "Enter an answer between 1 and 2000 characters.",
    answeredConflict: "This inquiry was already answered. The latest server answer is now displayed.",
    convergenceError: "Unable to confirm the latest inquiry state from the server.",
  },
  content: {
    title: "Permanent content deletion",
    description: "Load one question or meeting by ID, then permanently delete only when the confirmation phrase matches exactly.",
    type: "Content type",
    question: "Question",
    meeting: "Meeting",
    contentId: "Content ID",
    invalidId: "Enter a positive integer ID.",
    loadPreview: "Load preview",
    preview: "Deletion target",
    author: "Author",
    createdAt: "Created at",
    deletedAt: "Soft-deleted at",
    notDeleted: "Not deleted",
    requiredToken: "Type the confirmation phrase exactly.",
    confirmation: "Confirmation phrase",
    hardDelete: "Permanently delete",
  },
  knowledge: {
    title: "Knowledge candidate review",
    status: "Status",
    subject: "Subject",
    predicate: "Predicate",
    object: "Object",
    source: "Source",
    confidence: "Confidence",
    createdAt: "Created at",
    updatedAt: "Updated at",
    detail: "Candidate detail",
    backToList: "Back to list",
    context: "Candidate context",
    version: "Version",
    sourceStatus: "Source status",
    validUntil: "Valid until",
    questionId: "Question ID",
    answerId: "Answer ID",
    questionTitle: "Question title",
    questionContent: "Question content",
    answerContent: "Answer content",
    chunkContent: "Chunk content",
    extractionProvider: "Extraction provider",
    extractionModel: "Extraction model",
    reviewer: "Reviewer",
    reviewedAt: "Reviewed at",
    reviewNote: "Review note",
    promotionRelation: "Promotion relation",
    evidence: "Evidence text",
    chunk: "Evidence chunk",
    sourceEligibility: "Source eligibility",
    eligible: "Eligible",
    notEligible: "Not eligible",
    relation: "Relation edit",
    sameSourceRelations: "Same-source relations",
    review: "Review",
    rejectReason: "Reject reason",
    approve: "Approve",
    reject: "Reject",
    conflictRefreshed: "This candidate was already resolved or changed. The latest data is now displayed.",
    convergenceError: "Could not verify the latest candidate state.",
    graphTitle: "Knowledge graph",
    graphDescription: "Search approved concepts and inspect relation evidence.",
    graphSearch: "Search and filters",
    graphQuery: "Concept search",
    graphQueryPlaceholder: "Subject or object",
    resetFilters: "Reset",
    showWholeGraph: "Whole view",
    graphContext: "Graph scope",
    focusNode: "Focus node",
    nodes: "Nodes",
    edges: "Edges",
    zoom: "Zoom",
    graphCanvas: "Concept graph",
    truncatedGraph: "Results were truncated. Search or focus a node to narrow the graph.",
    emptyGraph: "No relations to display. Adjust the search or filters.",
    inspector: "Relation evidence",
    selectEdgeHint: "Select a relation line to inspect confidence, source, and evidence.",
  },
}

export { adminEn, adminKo }
export type { AdminMessages }
