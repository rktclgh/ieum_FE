import type { LanguageCode } from "@/lib/i18n/languages"
import type { CountryCode } from "@/lib/constants/countries"

import { adminKo } from "./admin"
import type { AdminMessages } from "./admin"

export interface Messages {
  admin: AdminMessages
  common: {
    or: string
    logout: string
    back: string
    close: string
    more: string
    retry: string
  }
  route: {
    invalidLink: string
  }
  session: {
    checking: string
    backendUnavailable: string
  }
  pwa: {
    title: string
    description: string
    later: string
    install: string
    iosDescription: string
    confirm: string
  }
  login: {
    logoText: string
    emailPlaceholder: string
    passwordPlaceholder: string
    submit: string
    forgotPassword: string
    signUp: string
    continueWithGoogle: string
    continueWithKakao: string
    loginErrorExplanation: string
  }
  social: {
    loading: string
    invalidToken: string
    suspended: string
    tokenExpired: string
    googleFailed: string
    kakaoFailed: string
    socialAlreadyRegistered: string
  }
  languagePicker: {
    confirm: string
  }
  join: {
    appBarTitle: string
    languageLabel: string
    emailLabel: string
    emailPlaceholder: string
    verifyButton: string
    resendButton: string
    verificationPlaceholder: string
    verificationSentExplanation: string
    verificationVerifiedExplanation: string
    verificationMismatchExplanation: string
    verificationExpiredExplanation: string
    emailInvalidExplanation: string
    emailDuplicateExplanation: string
    emailSendCodeErrorExplanation: string
    passwordLabel: string
    passwordPlaceholder: string
    passwordHintExplanation: string
    passwordConfirmLabel: string
    passwordMatchExplanation: string
    passwordMismatchExplanation: string
    nextButton: string
    infoAppBarTitle: string
    nicknameLabel: string
    nicknamePlaceholder: string
    nicknameDuplicateCheckButton: string
    nicknameAvailableExplanation: string
    nicknameDuplicateExplanation: string
    birthDateLabel: string
    birthDatePlaceholder: string
    birthDateHintExplanation: string
    genderLabel: string
    genderFemale: string
    genderMale: string
    nationalityLabel: string
    nationalityPlaceholder: string
    nationalitySearchPlaceholder: string
    createAccountButton: string
    signupErrorExplanation: string
  }
  home: {
    searchPlaceholder: string
    categoryAll: string
    categoryFriend: string
    categoryMeetup: string
    categoryQuestion: string
    locateMeLabel: string
    listViewLabel: string
    loginLabel: string
    selectedLocationPrefix: string
    clearSelectedLocationLabel: string
    createMeetupAction: string
    createQuestionAction: string
    createMenuOpenLabel: string
    createMenuCloseLabel: string
    meetupMarkerLabel: string
    questionMarkerLabel: string
    clusterMarkerLabel: (count: number) => string
    attributionButtonLabel: string
    pinsTruncatedNotice: string
    categoryPlace: string
    listTitle: string
    listParticipantCount: (count: number) => string
    searchEmpty: string
    listEmpty: string
    locatingMe: string
  }
  meetup: {
    joinButton: string
    participantCount: (count: number) => string
    closeLabel: string
    imageAlt: string
    noSchedule: string
    statusClosed: string
    statusCancelled: string
    participantsTitle: string
    hostBadge: string
    kickButton: string
    enterRoomButton: string
    leaveButton: string
    confirmCancelLabel: string
    leaveConfirmTitle: string
    leaveConfirmDescription: string
    kickConfirmTitle: string
    kickConfirmDescription: string
    errors: {
      MEETING_NOT_FOUND: string
      MEETING_NOT_OPEN: string
      MEETING_FULL: string
      KICKED_MEMBER: string
      HOST_CANNOT_LEAVE: string
      NOT_HOST: string
      NOT_MEETING_MEMBER: string
      VALIDATION_FAILED: string
      default: string
    }
  }
  createMeetup: {
    appBarTitle: string
    imageUploadFailed: string
    titlePlaceholder: string
    titleCounter: (current: number, max: number) => string
    titleTooLongExplanation: (max: number) => string
    datePlaceholder: string
    dateUndecidedLabel: string
    timePlaceholder: string
    addressPlaceholder: string
    descriptionPlaceholder: string
    imagePickerLabel: string
    imageAlt: string
    removeImageLabel: string
    addressSearchPlaceholder: string
    addressNoResults: string
    submitButton: string
    submittingButton: string
    cancelButton: string
    confirmButton: string
    takePhotoAction: string
    chooseAlbumAction: string
    amLabel: string
    pmLabel: string
    yearLabel: (year: number) => string
    monthLabel: (month: number) => string
    dayLabel: (day: number) => string
    hourLabel: (hour: number) => string
    minuteLabel: (minute: string) => string
  }
  selectLocation: {
    title: string
    nameTitle: string
    searchPlaceholder: string
    createPlaceTitle: string
    createPlaceButton: string
    selectButton: string
    namePlaceholder: string
    doneButton: string
    currentLocationLabel: string
    loadingAddress: string
    locationUnavailable: string
    searchEmpty: string
    clearLabel: string
  }
  question: {
    answerPlaceholder: string
    sendLabel: string
    viewAnswersLabel: string
    answeredLabel: string
    closeLabel: string
    imageAlt: string
    flagAlt: string
    detailTitle: string
    resolvedBadge: string
    answersTitle: (count: number) => string
    emptyAnswers: string
    loadError: string
    aiBadge: string
    acceptedBadge: string
    acceptButton: string
    acceptConfirmTitle: (name: string) => string
    acceptConfirmDescription: string
    acceptConfirmCancel: string
    acceptConfirmConfirm: string
    createTitle: string
    editTitle: string
    titlePlaceholder: string
    contentPlaceholder: string
    locationPlaceholder: string
    submitButton: string
    submittingButton: string
    updateButton: string
    imageUploadFailed: string
    imageTooLarge: string
    similarTitle: string
    timeJustNow: string
    timeMinutesAgo: (minutes: number) => string
    timeHoursAgo: (hours: number) => string
    timeDaysAgo: (days: number) => string
    addImageLabel: string
    historyTitle: string
    historyEmpty: string
    editAction: string
    deleteAction: string
    deleteConfirmTitle: string
    deleteConfirmDescription: string
    deleteConfirmCancel: string
    deleteConfirmConfirm: string
    startChatLabel: string
    personalChatLabel: string
    reportAction: string
    reportConfirmTitle: string
    reportConfirmDescription: string
    reportSubmitted: string
    chatStartFailed: string
    answerCountLabel: (count: number) => string
    aiAnswerTitle: string
    errors: {
      FORBIDDEN: string
      QUESTION_NOT_FOUND: string
      ANSWER_NOT_FOUND: string
      SELF_ACCEPT_NOT_ALLOWED: string
      ANSWER_SELECTION_FINALIZED: string
      VALIDATION_FAILED: string
      INVALID_IMAGE: string
      QUESTION_RESOLVED: string
      ROOM_CREATE_FAILED: string
      REPORT_FAILED: string
      default: string
    }
  }
  my: {
    editInfoLabel: string
    edit: {
      title: string
      saveButton: string
    }
    notifications: {
      title: string
      notifyAllLabel: string
      pushDeviceConnected: string
      pushDeviceConnect: string
      pushDeviceUnsupported: string
      pushDeviceIosInstall: string
      pushDevicePermissionDenied: string
      pushDeviceUnavailable: string
      pushDeviceError: string
      notifyRadiusLabel: string
      radiusOption: (km: number) => string
      saveError: string
    }
    permissions: {
      title: string
      cameraPermissionLabel: string
      saveError: string
    }
    inquiry: {
      title: string
      placeholder: string
      guide1: string
      guide2: string
      cancel: string
      submit: string
      success: string
      error: string
    }
    errors: {
      NICKNAME_TAKEN: string
      VALIDATION_FAILED: string
      default: string
    }
    menu: {
      notifications: string
      permissions: string
      language: string
      inquiry: string
      version: string
      logout: string
      withdraw: string
    }
    logoutDialog: {
      title: string
      description: string
      cancel: string
      confirm: string
    }
    withdrawDialog: {
      title: string
      description: string
      cancel: string
      confirm: string
      error: string
    }
  }
  profileImage: {
    takePhoto: string
    chooseAlbum: string
    editLabel: string
    deleteLabel: string
    uploadFailed: string
    invalidType: string
    tooLarge: string
    cropTitle: string
    cropConfirm: string
    cropCancel: string
  }
  tabBar: {
    home: string
    chat: string
    questions: string
    my: string
  }
  chat: {
    listSearchPlaceholder: string
    emptyList: string
    friendSearchPlaceholder: string
    addFriendTitle: string
    myFriendsTitle: string
    receivedRequestsTitle: string
    sentRequestsTitle: string
    recommendedFriendsTitle: string
    myFriendsSectionTitle: string
    acceptButton: string
    rejectButton: string
    cancelRequestButton: string
    cancelButton: string
    rejectConfirmTitle: (name: string) => string
    rejectConfirmDescription: string
    cancelRequestConfirmTitle: (name: string) => string
    cancelRequestConfirmDescription: string
    blockFriendConfirmTitle: (name: string) => string
    blockFriendConfirmDescription: string
    removeFriendConfirmTitle: (name: string) => string
    removeFriendConfirmDescription: string
    addFriendButton: string
    requestedButton: string
    pinAction: string
    enableNotificationAction: string
    disableNotificationAction: string
    deleteAction: string
    replyAction: string
    replyToLabel: (targetName: string) => string
    replyFromToLabel: (senderName: string, targetName: string) => string
    replyImageLabel: string
    cancelReplyAction: string
    reportAction: string
    registerAsNoticeAction: string
    setChatNoticeAction: string
    unsetChatNoticeAction: string
    noticeEmptyLabel: string
    blockAction: string
    takePhotoAction: string
    chooseAlbumAction: string
    noticeLabel: string
    scheduleLabel: string
    membersTitle: string
    meLabel: string
    removeMemberButton: string
    leaveChatAction: string
    disbandChatAction: string
    sendFailed: string
    leaveFailed: string
    disbandFailed: string
    connecting: string
    leaveChatConfirmTitle: string
    leaveChatConfirmDescription: string
    disbandChatConfirmTitle: string
    disbandChatConfirmDescription: string
    messageInputPlaceholder: string
    sendButtonLabel: string
    imageAlt: string
    imageUploadFailed: string
  }
  schedule: {
    addButtonLabel: string
    editorCreateTitle: string
    editorEditTitle: string
    titlePlaceholder: string
    dateLabel: string
    timePlaceholder: string
    locationPlaceholder: string
    createAction: string
    updateAction: string
    editAction: string
    deleteAction: string
    deleteConfirmTitle: string
    deleteConfirmDescription: string
    editorRequired: string
    pastDateError: string
    saveError: string
    previousMonthLabel: string
    nextMonthLabel: string
    selectMonthLabel: string
    confirmButton: string
    emptyStateLabel: string
    loadError: string
    cancelAction: string
    cancelConfirmTitle: string
    cancelConfirmDescription: string
    errors: {
      SCHEDULE_ALREADY_EXISTS: string
      SCHEDULE_NOT_FOUND: string
      SCHEDULE_NOT_CANCELLABLE: string
      VALIDATION_FAILED: string
      default: string
    }
  }
  report: {
    title: string
    reasonSectionTitle: string
    reasonDobae: string
    reasonAd: string
    reasonAbuse: string
    reasonSexualHarassment: string
    reasonPornography: string
    reasonEtc: string
    detailPlaceholder: string
    guideEtc: string
    guideReview: string
    cancelButton: string
    submitButton: string
    confirmTitle: (name: string) => string
    confirmTitleGeneric: string
    confirmScheduleTitle: (name: string) => string
    confirmScheduleTitleGeneric: string
    confirmDescription: string
    errors: {
      REPORT_MESSAGE_NOT_FOUND: string
      NOT_ROOM_MEMBER: string
      VALIDATION_FAILED: string
      default: string
    }
  }
  friends: {
    errors: {
      SELF_FRIEND_REQUEST: string
      REQUEST_EXISTS: string
      ALREADY_FRIENDS: string
      BLOCKED: string
      USER_NOT_FOUND: string
      FRIENDSHIP_NOT_FOUND: string
      CANNOT_ACCEPT_OWN_REQUEST: string
      VALIDATION_FAILED: string
      default: string
    }
    emptyFriends: string
    loadError: string
    searchEmpty: string
    searching: string
  }
  notification: {
    appBarTitle: string
    empty: string
    loadError: string
    readAllButton: string
    deleteAction: string
    deleteConfirmTitle: string
    deleteConfirmDescription: string
    deleteConfirmCancel: string
    deleteConfirmConfirm: string
    bellLabel: string
    unreadBadgeLabel: (count: number) => string
    aiAnswerSourceLabel: string
    humanAnswerSourceLabel: string
  }
  translate: {
    menuLabel: string
    viewOriginalLabel: string
    translatingLabel: string
    translateFailedLabel: string
  }
  languages: Record<LanguageCode, string>
  countries: Record<CountryCode, string>
}

export const ko: Messages = {
  admin: adminKo,
  common: {
    or: "or",
    logout: "로그아웃",
    back: "뒤로 가기",
    close: "닫기",
    more: "더보기",
    retry: "다시 시도",
  },
  route: {
    invalidLink: "유효하지 않은 링크입니다.",
  },
  session: {
    checking: "로그인 상태를 확인하고 있어요.",
    backendUnavailable: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  },
  pwa: {
    title: "이음 앱 설치",
    description: "홈 화면에 추가하고 더 편하게 이용하세요.",
    later: "나중에",
    install: "설치",
    iosDescription: "공유 버튼을 누르고 '홈 화면에 추가'를 선택하세요.",
    confirm: "확인",
  },
  login: {
    logoText: "이음",
    emailPlaceholder: "이메일 입력",
    passwordPlaceholder: "비밀번호 입력",
    submit: "로그인",
    forgotPassword: "비밀번호 찾기",
    signUp: "회원가입",
    continueWithGoogle: "구글로 로그인",
    continueWithKakao: "카카오로 로그인",
    loginErrorExplanation: "이메일 혹은 패스워드가 일치하지 않습니다.",
  },
  social: {
    loading: "로그인 중...",
    invalidToken: "소셜 로그인 인증에 실패했습니다. 다시 시도해주세요.",
    suspended: "이용이 제한된 계정입니다.",
    tokenExpired: "가입 시간이 만료되었습니다. 다시 로그인해주세요.",
    googleFailed: "구글 로그인에 실패했습니다. 다시 시도해주세요.",
    kakaoFailed: "카카오 로그인에 실패했습니다. 다시 시도해주세요.",
    socialAlreadyRegistered: "이미 가입된 소셜 계정입니다. 로그인해주세요.",
  },
  languagePicker: {
    confirm: "선택 완료",
  },
  join: {
    appBarTitle: "회원가입",
    languageLabel: "언어",
    emailLabel: "이메일",
    emailPlaceholder: "이메일 입력",
    verifyButton: "인증하기",
    resendButton: "다시전송",
    verificationPlaceholder: "인증번호 6자리 입력",
    verificationSentExplanation: "인증코드를 보냈습니다.",
    verificationVerifiedExplanation: "이메일 인증이 완료되었습니다.",
    verificationMismatchExplanation: "인증번호가 일치하지 않습니다.",
    verificationExpiredExplanation: "인증번호가 만료되었습니다. 다시 시도해주세요.",
    emailInvalidExplanation: "이메일 형식에 맞춰 입력해주세요.",
    emailDuplicateExplanation: "이미 가입된 이메일입니다.",
    emailSendCodeErrorExplanation: "인증코드 발송에 실패했습니다. 다시 시도해주세요.",
    passwordLabel: "비밀번호",
    passwordPlaceholder: "비밀번호 입력",
    passwordHintExplanation: "비밀번호는 특수문자를 포함하여 10자 이상이어야 합니다.",
    passwordConfirmLabel: "비밀번호 확인",
    passwordMatchExplanation: "비밀번호가 일치합니다.",
    passwordMismatchExplanation: "비밀번호가 불일치합니다.",
    nextButton: "다음",
    infoAppBarTitle: "정보 입력",
    nicknameLabel: "닉네임",
    nicknamePlaceholder: "닉네임 입력",
    nicknameDuplicateCheckButton: "중복확인",
    nicknameAvailableExplanation: "사용 가능한 닉네임입니다.",
    nicknameDuplicateExplanation: "이미 사용중인 닉네임입니다.",
    birthDateLabel: "생년월일",
    birthDatePlaceholder: "생년월일 입력",
    birthDateHintExplanation: "생년월일 8자리를 입력해주세요.",
    genderLabel: "성별",
    genderFemale: "여성",
    genderMale: "남성",
    nationalityLabel: "국적",
    nationalityPlaceholder: "국적 선택",
    nationalitySearchPlaceholder: "국가 검색",
    createAccountButton: "계정 만들기",
    signupErrorExplanation: "회원가입에 실패했습니다. 다시 시도해주세요.",
  },
  home: {
    searchPlaceholder: "지역, 모임, 질문 검색",
    categoryAll: "전체",
    categoryFriend: "친구",
    categoryMeetup: "모임",
    categoryQuestion: "질문",
    locateMeLabel: "내 위치로 이동",
    listViewLabel: "목록 보기",
    loginLabel: "로그인",
    selectedLocationPrefix: "선택한 위치",
    clearSelectedLocationLabel: "선택 해제",
    createMeetupAction: "모임 만들기",
    createQuestionAction: "질문하기",
    createMenuOpenLabel: "만들기 메뉴 열기",
    createMenuCloseLabel: "만들기 메뉴 닫기",
    meetupMarkerLabel: "모임",
    questionMarkerLabel: "질문",
    clusterMarkerLabel: (count) => `이 지역 ${count}개`,
    attributionButtonLabel: "지도 저작권 정보",
    pinsTruncatedNotice: "이 지역에 핀이 많아요. 확대해서 보세요",
    categoryPlace: "장소",
    listTitle: "리스트",
    listParticipantCount: (count) => `현재 ${count}명`,
    searchEmpty: "검색 결과가 없습니다",
    listEmpty: "이 지역에 표시할 항목이 없습니다",
    locatingMe: "내 위치를 찾는 중…",
  },
  meetup: {
    joinButton: "참여하기",
    participantCount: (count) => `현재 ${count}명 참여 중`,
    closeLabel: "닫기",
    imageAlt: "모임 이미지",
    noSchedule: "일정 미정",
    statusClosed: "모집 마감",
    statusCancelled: "취소된 모임",
    participantsTitle: "참여자",
    hostBadge: "호스트",
    kickButton: "내보내기",
    enterRoomButton: "채팅방 가기",
    leaveButton: "모임 나가기",
    confirmCancelLabel: "취소",
    leaveConfirmTitle: "모임에서 나갈까요?",
    leaveConfirmDescription: "나가면 이 모임의 채팅방에서도 나가게 돼요.",
    kickConfirmTitle: "이 멤버를 내보낼까요?",
    kickConfirmDescription: "내보낸 멤버는 다시 참여할 수 없어요.",
    errors: {
      MEETING_NOT_FOUND: "모임을 찾을 수 없어요.",
      MEETING_NOT_OPEN: "모집이 마감된 모임이에요.",
      MEETING_FULL: "정원이 가득 찼어요.",
      KICKED_MEMBER: "내보내진 모임에는 다시 참여할 수 없어요.",
      HOST_CANNOT_LEAVE: "호스트는 모임을 나갈 수 없어요.",
      NOT_HOST: "호스트만 할 수 있는 작업이에요.",
      NOT_MEETING_MEMBER: "모임 참여자가 아니에요.",
      VALIDATION_FAILED: "입력한 내용을 다시 확인해 주세요.",
      default: "잠시 후 다시 시도해 주세요.",
    },
  },
  createMeetup: {
    appBarTitle: "새 모임 작성",
    imageUploadFailed: "이미지 업로드에 실패했어요. 다시 시도해 주세요.",
    titlePlaceholder: "모임 제목 (15자 이하)",
    titleCounter: (current, max) => `(${current}/${max})`,
    titleTooLongExplanation: (max) => `모임 제목을 ${max}글자 이내로 적어주세요.`,
    datePlaceholder: "날짜 선택",
    dateUndecidedLabel: "날짜 미정",
    timePlaceholder: "시간 선택",
    addressPlaceholder: "주소 선택",
    descriptionPlaceholder: "모임 내용을 입력해주세요.",
    imagePickerLabel: "사진 (선택)",
    imageAlt: "첨부한 사진",
    removeImageLabel: "사진 삭제",
    addressSearchPlaceholder: "장소 검색",
    addressNoResults: "검색 결과가 없어요.",
    submitButton: "모임 올리기",
    submittingButton: "올리는 중…",
    cancelButton: "취소",
    confirmButton: "완료",
    takePhotoAction: "사진 찍기",
    chooseAlbumAction: "앨범에서 고르기",
    amLabel: "오전",
    pmLabel: "오후",
    yearLabel: (year) => `${year}년`,
    monthLabel: (month) => `${month}월`,
    dayLabel: (day) => `${day}일`,
    hourLabel: (hour) => `${hour}시`,
    minuteLabel: (minute) => `${minute}분`,
  },
  selectLocation: {
    title: "장소 선택",
    nameTitle: "장소명 입력",
    searchPlaceholder: "장소명 검색",
    createPlaceTitle: "이 주소에 대한 장소명 입력하기",
    createPlaceButton: "입력",
    selectButton: "선택",
    namePlaceholder: "장소명 입력",
    doneButton: "완료",
    currentLocationLabel: "내 위치",
    loadingAddress: "주소를 불러오는 중…",
    locationUnavailable: "현재 위치를 찾지 못해 서울 시청 주변을 표시합니다.",
    searchEmpty: "검색 결과가 없어요.",
    clearLabel: "지우기",
  },
  question: {
    answerPlaceholder: "답변 입력",
    sendLabel: "전송",
    viewAnswersLabel: "답변 보기",
    answeredLabel: "답변 완료",
    closeLabel: "닫기",
    imageAlt: "질문 이미지",
    flagAlt: "국기",
    detailTitle: "질문",
    resolvedBadge: "해결됨",
    answersTitle: (count) => `답변 ${count}`,
    emptyAnswers: "아직 답변이 없어요.",
    loadError: "질문을 불러오지 못했어요.",
    aiBadge: "AI",
    acceptedBadge: "채택됨",
    acceptButton: "채택",
    acceptConfirmTitle: (name) => `${name}님의 답변을 채택할까요?`,
    acceptConfirmDescription: "채택 후에는 변경할 수 없습니다",
    acceptConfirmCancel: "취소",
    acceptConfirmConfirm: "확정",
    createTitle: "질문하기",
    editTitle: "질문 수정",
    titlePlaceholder: "질문 제목",
    contentPlaceholder: "질문 내용을 입력해주세요.",
    locationPlaceholder: "장소 선택",
    submitButton: "질문 올리기",
    submittingButton: "올리는 중…",
    updateButton: "수정 완료",
    imageUploadFailed: "이미지 업로드에 실패했어요. 다시 시도해 주세요.",
    imageTooLarge: "이미지는 5MB 이하만 첨부할 수 있어요.",
    similarTitle: "비슷한 질문",
    timeJustNow: "방금 전",
    timeMinutesAgo: (minutes) => `${minutes}분 전`,
    timeHoursAgo: (hours) => `${hours}시간 전`,
    timeDaysAgo: (days) => `${days}일 전`,
    addImageLabel: "사진 첨부",
    historyTitle: "질문 내역",
    historyEmpty: "아직 등록한 질문이 없어요.",
    editAction: "수정",
    deleteAction: "삭제",
    deleteConfirmTitle: "이 질문을 삭제할까요?",
    deleteConfirmDescription: "삭제하면 답변과 함께 사라지며 되돌릴 수 없어요.",
    deleteConfirmCancel: "취소",
    deleteConfirmConfirm: "삭제",
    startChatLabel: "채팅 시작",
    personalChatLabel: "개인 채팅",
    reportAction: "신고",
    reportConfirmTitle: "이 답변을 신고할까요?",
    reportConfirmDescription: "신고하면 검토 후 조치될 수 있어요.",
    reportSubmitted: "신고가 접수되었어요.",
    chatStartFailed: "채팅을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.",
    answerCountLabel: (count) => `답변 ${count}`,
    aiAnswerTitle: "AI답변",
    errors: {
      FORBIDDEN: "권한이 없어요.",
      QUESTION_NOT_FOUND: "질문을 찾을 수 없어요.",
      ANSWER_NOT_FOUND: "답변을 찾을 수 없어요.",
      SELF_ACCEPT_NOT_ALLOWED: "내 답변은 채택할 수 없어요.",
      ANSWER_SELECTION_FINALIZED: "이미 채택된 질문이에요.",
      VALIDATION_FAILED: "입력값을 확인해 주세요.",
      INVALID_IMAGE: "이미지를 확인할 수 없어요. 다시 첨부해 주세요.",
      QUESTION_RESOLVED: "이미 확정된 질문은 수정할 수 없어요.",
      ROOM_CREATE_FAILED: "채팅을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.",
      REPORT_FAILED: "신고에 실패했어요. 잠시 후 다시 시도해 주세요.",
      default: "잠시 후 다시 시도해 주세요.",
    },
  },
  my: {
    editInfoLabel: "내 정보 수정",
    edit: {
      title: "내 정보 수정",
      saveButton: "저장",
    },
    notifications: {
      title: "알림 설정",
      notifyAllLabel: "전체 알림",
      pushDeviceConnected: "이 기기에서 푸시 알림을 받고 있어요.",
      pushDeviceConnect: "이 기기 연결",
      pushDeviceUnsupported: "이 브라우저는 푸시 알림을 지원하지 않아요.",
      pushDeviceIosInstall: "홈 화면에 추가하면 푸시 알림을 받을 수 있어요.",
      pushDevicePermissionDenied: "브라우저 설정에서 알림 권한을 허용해 주세요.",
      pushDeviceUnavailable: "푸시 알림을 지금 사용할 수 없어요.",
      pushDeviceError: "푸시 알림을 연결하지 못했어요. 다시 시도해 주세요.",
      notifyRadiusLabel: "알림 반경",
      radiusOption: (km) => `${km}km`,
      saveError: "설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    },
    permissions: {
      title: "권한 설정",
      cameraPermissionLabel: "카메라 권한",
      saveError: "설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    },
    inquiry: {
      title: "문의하기",
      placeholder: "문의 내용을 입력해 주세요.",
      guide1: "문의하신 내용은 최대 7일 안에 답변 드리겠습니다.",
      guide2: "답변은 등록하신 이메일로 전송해드립니다.",
      cancel: "취소",
      submit: "문의",
      success: "문의가 접수되었어요.",
      error: "문의 등록에 실패했어요. 잠시 후 다시 시도해 주세요.",
    },
    errors: {
      NICKNAME_TAKEN: "이미 사용중인 닉네임이에요.",
      VALIDATION_FAILED: "입력값을 다시 확인해 주세요.",
      default: "잠시 후 다시 시도해 주세요.",
    },
    menu: {
      notifications: "알림 설정",
      permissions: "권한 설정",
      language: "언어 설정",
      inquiry: "문의하기",
      version: "버전 정보",
      logout: "로그아웃",
      withdraw: "회원탈퇴",
    },
    logoutDialog: {
      title: "이음에서 로그아웃합니다",
      description: "정말로 로그아웃 하시겠습니까?",
      cancel: "취소",
      confirm: "로그아웃",
    },
    withdrawDialog: {
      title: "현재 계정을 탈퇴합니다",
      description: "정말로 탈퇴하시겠습니까?",
      cancel: "취소",
      confirm: "탈퇴",
      error: "탈퇴에 실패했어요. 잠시 후 다시 시도해 주세요.",
    },
  },
  profileImage: {
    takePhoto: "사진 찍기",
    chooseAlbum: "앨범에서 고르기",
    editLabel: "프로필 사진 편집",
    deleteLabel: "사진 삭제",
    uploadFailed: "사진 업로드에 실패했어요. 잠시 후 다시 시도해주세요.",
    invalidType: "이미지 파일만 업로드할 수 있어요.",
    tooLarge: "10MB 이하의 이미지를 사용해주세요.",
    cropTitle: "사진 편집",
    cropConfirm: "확인",
    cropCancel: "취소",
  },
  tabBar: {
    home: "홈",
    chat: "채팅",
    questions: "질문",
    my: "마이",
  },
  chat: {
    listSearchPlaceholder: "채팅, 친구 검색",
    emptyList: "아직 채팅방이 없어요",
    friendSearchPlaceholder: "닉네임 검색",
    addFriendTitle: "친구 추가",
    myFriendsTitle: "친구",
    receivedRequestsTitle: "받은 친구 요청",
    sentRequestsTitle: "보낸 친구 요청",
    recommendedFriendsTitle: "추천 친구",
    myFriendsSectionTitle: "내 친구",
    acceptButton: "수락",
    rejectButton: "거절",
    cancelRequestButton: "요청 취소",
    cancelButton: "취소",
    rejectConfirmTitle: (name) => `${name}님의 친구 신청을 거절합니다`,
    rejectConfirmDescription: "정말로 거절하시겠습니까?",
    cancelRequestConfirmTitle: (name) => `${name}님에게 보낸 친구 요청을 취소합니다`,
    cancelRequestConfirmDescription: "정말로 취소하시겠습니까?",
    blockFriendConfirmTitle: (name) => `${name}님을 차단합니다`,
    blockFriendConfirmDescription: "정말로 차단하시겠습니까?",
    removeFriendConfirmTitle: (name) => `${name}님을 삭제합니다`,
    removeFriendConfirmDescription: "정말로 삭제하시겠습니까?",
    addFriendButton: "친구 요청",
    requestedButton: "요청됨",
    pinAction: "고정",
    enableNotificationAction: "알림 켜기",
    disableNotificationAction: "알림 끄기",
    deleteAction: "삭제",
    replyAction: "답글 달기",
    replyToLabel: (targetName) => `${targetName}님에게 답장`,
    replyFromToLabel: (senderName, targetName) => `${senderName}님이 ${targetName}님에게 답장`,
    replyImageLabel: "사진",
    cancelReplyAction: "답장 취소",
    reportAction: "신고",
    registerAsNoticeAction: "공지로 등록",
    setChatNoticeAction: "채팅방 공지 등록하기",
    unsetChatNoticeAction: "채팅방 공지 해지하기",
    noticeEmptyLabel: "등록된 공지가 없어요",
    blockAction: "차단",
    takePhotoAction: "사진 찍기",
    chooseAlbumAction: "앨범에서 고르기",
    noticeLabel: "공지",
    scheduleLabel: "일정",
    membersTitle: "대화 상대",
    meLabel: "나",
    removeMemberButton: "내보내기",
    leaveChatAction: "채팅방 나가기",
    disbandChatAction: "모임 해체하기",
    sendFailed: "메시지를 보낼 수 없습니다. 연결을 확인해주세요.",
    leaveFailed: "채팅방 나가기에 실패했습니다.",
    disbandFailed: "모임 해체에 실패했습니다.",
    connecting: "연결 중…",
    leaveChatConfirmTitle: "채팅방을 나갑니다",
    leaveChatConfirmDescription: "정말로 나가시겠습니까?",
    disbandChatConfirmTitle: "모임을 해체합니다",
    disbandChatConfirmDescription: "모임을 해체하면 연결된 채팅방과 참여자 목록에서도 모두 제거되며, 되돌릴 수 없습니다.",
    messageInputPlaceholder: "메시지 입력",
    sendButtonLabel: "전송",
    imageAlt: "전송한 사진",
    imageUploadFailed: "사진 전송에 실패했어요. 다시 시도해주세요.",
  },
  schedule: {
    addButtonLabel: "일정 추가",
    editorCreateTitle: "일정 등록",
    editorEditTitle: "일정 수정",
    titlePlaceholder: "일정 제목",
    dateLabel: "날짜",
    timePlaceholder: "시간 선택",
    locationPlaceholder: "위치 선택",
    createAction: "등록",
    updateAction: "저장",
    editAction: "수정",
    deleteAction: "삭제",
    deleteConfirmTitle: "일정을 삭제할까요?",
    deleteConfirmDescription: "삭제한 일정은 되돌릴 수 없어요.",
    editorRequired: "제목, 시간, 위치를 모두 입력해 주세요.",
    pastDateError: "오늘 이전 날짜에는 일정을 등록할 수 없어요.",
    saveError: "일정 저장에 실패했어요.",
    previousMonthLabel: "이전 달",
    nextMonthLabel: "다음 달",
    selectMonthLabel: "연도 및 월 선택",
    confirmButton: "완료",
    emptyStateLabel: "등록된 일정이 없어요",
    loadError: "일정을 불러오지 못했어요.",
    cancelAction: "일정 취소",
    cancelConfirmTitle: "일정을 취소할까요?",
    cancelConfirmDescription: "취소한 일정은 되돌릴 수 없어요.",
    errors: {
      SCHEDULE_ALREADY_EXISTS: "이미 같은 일정이 있어요.",
      SCHEDULE_NOT_FOUND: "일정을 찾을 수 없어요.",
      SCHEDULE_NOT_CANCELLABLE: "취소할 수 없는 일정이에요.",
      VALIDATION_FAILED: "요청을 처리할 수 없어요.",
      default: "잠시 후 다시 시도해 주세요.",
    },
  },
  report: {
    title: "신고하기",
    reasonSectionTitle: "신고 사유",
    reasonDobae: "도배",
    reasonAd: "원치 않는 상업성 광고",
    reasonAbuse: "욕설 및 혐오 발언",
    reasonSexualHarassment: "성희롱 발언",
    reasonPornography: "음란물 유포",
    reasonEtc: "기타",
    detailPlaceholder: "1,000자 이내로 신고 내용을 입력해 주세요.",
    guideEtc: "신고 항목에 포함되지 않는 내용은 기타를 선택하여 신고 내용을 작성해주시기 바랍니다.",
    guideReview: "신고해주신 내용은 관리자 검토 후 내부 정책에 의거 조치가 진행됩니다.",
    cancelButton: "취소",
    submitButton: "신고",
    confirmTitle: (name) => `${name}님의 메시지를 신고합니다`,
    confirmTitleGeneric: "메시지를 신고합니다",
    confirmScheduleTitle: (name) => `${name} 일정을 신고합니다`,
    confirmScheduleTitleGeneric: "일정을 신고합니다",
    confirmDescription: "정말로 신고하시겠습니까?",
    errors: {
      REPORT_MESSAGE_NOT_FOUND: "삭제되었거나 존재하지 않는 메시지예요.",
      NOT_ROOM_MEMBER: "채팅방 멤버가 아니어서 신고할 수 없어요.",
      VALIDATION_FAILED: "요청을 처리할 수 없어요.",
      default: "잠시 후 다시 시도해 주세요.",
    },
  },
  friends: {
    errors: {
      SELF_FRIEND_REQUEST: "자기 자신에게는 친구 요청을 보낼 수 없어요.",
      REQUEST_EXISTS: "이미 친구 요청을 보냈어요.",
      ALREADY_FRIENDS: "이미 친구예요.",
      BLOCKED: "차단 관계라 진행할 수 없어요.",
      USER_NOT_FOUND: "사용자를 찾을 수 없어요.",
      FRIENDSHIP_NOT_FOUND: "이미 처리된 요청이에요.",
      CANNOT_ACCEPT_OWN_REQUEST: "내가 보낸 요청은 수락할 수 없어요.",
      VALIDATION_FAILED: "요청을 처리할 수 없어요.",
      default: "잠시 후 다시 시도해 주세요.",
    },
    emptyFriends: "아직 친구가 없어요.",
    loadError: "친구 목록을 불러오지 못했어요.",
    searchEmpty: "검색 결과가 없어요.",
    searching: "검색 중...",
  },
  notification: {
    appBarTitle: "알림",
    empty: "받은 알림이 없어요.",
    loadError: "알림을 불러오지 못했어요.",
    readAllButton: "전체 읽음",
    deleteAction: "삭제",
    deleteConfirmTitle: "알림을 삭제할까요?",
    deleteConfirmDescription: "삭제한 알림은 복구할 수 없어요.",
    deleteConfirmCancel: "취소",
    deleteConfirmConfirm: "삭제",
    bellLabel: "알림",
    unreadBadgeLabel: (count) => `읽지 않은 알림 ${count}건`,
    aiAnswerSourceLabel: "AI 답변",
    humanAnswerSourceLabel: "사용자 답변",
  },
  translate: {
    menuLabel: "번역",
    viewOriginalLabel: "원문 보기",
    translatingLabel: "번역 중...",
    translateFailedLabel: "번역에 실패했어요. 잠시 후 다시 시도해 주세요.",
  },
  languages: {
    ko: "한국어",
    en: "영어",
    ja: "일본어",
    zh: "중국어",
    vi: "베트남어",
    th: "태국어",
    ru: "러시아어",
  },
  countries: {
    "zimbabwe": "짐바브웨",
    "zambia": "잠비아",
    "yemen": "예멘",
    "us-virgin-islands": "미국령 버진아일랜드",
    "vietnam": "베트남",
    "venezuela": "베네수엘라",
    "vanuatu": "바누아투",
    "uzbekistan": "우즈베키스탄",
    "uruguay": "우루과이",
    "united-states": "미국",
    "united-kingdom": "영국",
    "united-arab-emirates": "아랍에미리트",
    "ukraine": "우크라이나",
    "uganda": "우간다",
    "tuvalu": "투발루",
    "turkmenistan": "투르크메니스탄",
    "turkey": "튀르키예",
    "tunisia": "튀니지",
    "trinidad-and-tobago": "트리니다드 토바고",
    "tonga": "통가",
    "togo": "토고",
    "timor-leste": "동티모르",
    "thailand": "태국",
    "tanzania": "탄자니아",
    "tajikistan": "타지키스탄",
    "syria": "시리아",
    "switzerland": "스위스",
    "sweden": "스웨덴",
    "suriname": "수리남",
    "sudan": "수단",
    "sri-lanka": "스리랑카",
    "spain": "스페인",
    "south-sudan": "남수단",
    "south-korea": "대한민국",
    "south-africa": "남아프리카 공화국",
    "somalia": "소말리아",
    "solomon-islands": "솔로몬 제도",
    "slovenia": "슬로베니아",
    "slovakia": "슬로바키아",
    "sint-maarten": "신트마르턴",
    "singapore": "싱가포르",
    "sierra-leone": "시에라리온",
    "seychelles": "세이셸",
    "serbia": "세르비아",
    "senegal": "세네갈",
    "saudi-arabia": "사우디아라비아",
    "sao-tome-and-principe": "상투메 프린시페",
    "san-marino": "산마리노",
    "samoa": "사모아",
    "saint-vincent-and-the-grenadines": "세인트빈센트 그레나딘",
    "saint-lucia": "세인트루시아",
    "rwanda": "르완다",
    "russia": "러시아",
    "romania": "루마니아",
    "qatar": "카타르",
    "portugal": "포르투갈",
    "poland": "폴란드",
    "philippines": "필리핀",
    "peru": "페루",
    "paraguay": "파라과이",
    "papua-new-guinea": "파푸아뉴기니",
    "panama": "파나마",
    "palestine": "팔레스타인",
    "palau": "팔라우",
    "pakistan": "파키스탄",
    "oman": "오만",
    "norway": "노르웨이",
    "north-macedonia": "북마케도니아",
    "nigeria": "나이지리아",
    "niger": "니제르",
    "nicaragua": "니카라과",
    "new-zealand": "뉴질랜드",
    "netherlands": "네덜란드",
    "nepal": "네팔",
    "nauru": "나우루",
    "namibia": "나미비아",
    "myanmar": "미얀마",
    "mozambique": "모잠비크",
    "morocco": "모로코",
    "montenegro": "몬테네그로",
    "mongolia": "몽골",
    "monaco": "모나코",
    "moldova": "몰도바",
    "micronesia": "미크로네시아",
    "mexico": "멕시코",
    "mauritius": "모리셔스",
    "mauritania": "모리타니",
    "marshall-islands": "마셜 제도",
    "malta": "몰타",
    "mali": "말리",
    "maldives": "몰디브",
    "malaysia": "말레이시아",
    "malawi": "말라위",
    "madagascar": "마다가스카르",
    "luxembourg": "룩셈부르크",
    "lithuania": "리투아니아",
    "liechtenstein": "리히텐슈타인",
    "libya": "리비아",
    "liberia": "라이베리아",
    "lesotho": "레소토",
    "lebanon": "레바논",
    "latvia": "라트비아",
    "laos": "라오스",
    "kyrgyzstan": "키르기스스탄",
    "kuwait": "쿠웨이트",
    "kiribati": "키리바시",
    "kenya": "케냐",
    "kazakhstan": "카자흐스탄",
    "jordan": "요르단",
    "japan": "일본",
    "jamaica": "자메이카",
    "ivory-coast": "코트디부아르",
    "italy": "이탈리아",
    "israel": "이스라엘",
    "ireland": "아일랜드",
    "iraq": "이라크",
    "iran": "이란",
    "indonesia": "인도네시아",
    "india": "인도",
    "iceland": "아이슬란드",
    "hungary": "헝가리",
    "hong-kong": "홍콩",
    "honduras": "온두라스",
    "vatican-city": "바티칸 시국",
    "haiti": "아이티",
    "guyana": "가이아나",
    "guinea-bissau": "기니비사우",
    "guinea": "기니",
    "guatemala": "과테말라",
    "grenada": "그레나다",
    "greece": "그리스",
    "ghana": "가나",
    "germany": "독일",
    "georgia": "조지아",
    "gambia": "감비아",
    "gabon": "가봉",
    "france": "프랑스",
    "finland": "핀란드",
    "fiji": "피지",
    "ethiopia": "에티오피아",
    "eswatini": "에스와티니",
    "estonia": "에스토니아",
    "eritrea": "에리트레아",
    "equatorial-guinea": "적도기니",
    "el-salvador": "엘살바도르",
    "egypt": "이집트",
    "ecuador": "에콰도르",
    "dominican-republic": "도미니카 공화국",
    "dominica": "도미니카 연방",
    "djibouti": "지부티",
    "denmark": "덴마크",
    "democratic-republic-of-the-congo": "콩고 민주공화국",
    "czechia": "체코",
    "cyprus": "키프로스",
    "curacao": "퀴라소",
    "cuba": "쿠바",
    "croatia": "크로아티아",
    "costa-rica": "코스타리카",
    "republic-of-the-congo": "콩고 공화국",
    "comoros": "코모로",
    "colombia": "콜롬비아",
    "china": "중국",
    "chile": "칠레",
    "chad": "차드",
    "central-african-republic": "중앙아프리카 공화국",
    "cape-verde": "카보베르데",
    "canada": "캐나다",
    "cameroon": "카메룬",
    "cambodia": "캄보디아",
    "burundi": "부룬디",
    "burkina-faso": "부르키나파소",
    "bulgaria": "불가리아",
    "brunei": "브루나이",
    "brazil": "브라질",
    "bouvet-island": "부베섬",
    "botswana": "보츠와나",
    "bosnia-and-herzegovina": "보스니아 헤르체고비나",
    "bolivia": "볼리비아",
    "bhutan": "부탄",
    "benin": "베냉",
    "belize": "벨리즈",
    "belgium": "벨기에",
    "belarus": "벨라루스",
    "barbados": "바베이도스",
    "bangladesh": "방글라데시",
    "bahrain": "바레인",
    "bahamas": "바하마",
    "azerbaijan": "아제르바이잔",
    "austria": "오스트리아",
    "aruba": "아루바",
    "armenia": "아르메니아",
    "argentina": "아르헨티나",
    "australia": "오스트레일리아",
    "antigua-and-barbuda": "앤티가 바부다",
    "angola": "앙골라",
    "andorra": "안도라",
    "algeria": "알제리",
    "albania": "알바니아",
    "afghanistan": "아프가니스탄",
  },
}
