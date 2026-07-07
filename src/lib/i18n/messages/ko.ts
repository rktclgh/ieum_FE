import type { LanguageCode } from "@/lib/i18n/languages"
import type { CountryCode } from "@/lib/constants/countries"

export interface Messages {
  common: {
    or: string
    logout: string
  }
  login: {
    logoAlt: string
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
    categoryMeetup: string
    categoryQuestion: string
    locateMeLabel: string
    listViewLabel: string
    createLabel: string
    loginLabel: string
    selectedLocationPrefix: string
    clearSelectedLocationLabel: string
  }
  my: {
    emailLabel: string
    gradeLabel: string
    acceptedCountLabel: string
  }
  tabBar: {
    home: string
    meetups: string
    questions: string
    my: string
  }
  languages: Record<LanguageCode, string>
  countries: Record<CountryCode, string>
}

export const ko: Messages = {
  common: {
    or: "or",
    logout: "로그아웃",
  },
  login: {
    logoAlt: "로고",
    emailPlaceholder: "이메일 입력",
    passwordPlaceholder: "비밀번호 입력",
    submit: "로그인",
    forgotPassword: "비밀번호 찾기",
    signUp: "회원가입",
    continueWithGoogle: "구글로 로그인",
    continueWithKakao: "카카오로 로그인",
    loginErrorExplanation: "이메일 또는 비밀번호를 확인해주세요.",
  },
  social: {
    loading: "로그인 중...",
    invalidToken: "소셜 로그인 인증에 실패했습니다. 다시 시도해주세요.",
    suspended: "이용이 제한된 계정입니다.",
    tokenExpired: "가입 시간이 만료되었습니다. 다시 로그인해주세요.",
    googleFailed: "구글 로그인에 실패했습니다. 다시 시도해주세요.",
    kakaoFailed: "카카오 로그인에 실패했습니다. 다시 시도해주세요.",
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
    categoryMeetup: "모임",
    categoryQuestion: "질문",
    locateMeLabel: "내 위치로 이동",
    listViewLabel: "목록 보기",
    createLabel: "만들기",
    loginLabel: "로그인",
    selectedLocationPrefix: "선택한 위치",
    clearSelectedLocationLabel: "선택 해제",
  },
  my: {
    emailLabel: "이메일",
    gradeLabel: "등급",
    acceptedCountLabel: "채택 수",
  },
  tabBar: {
    home: "홈",
    meetups: "모임",
    questions: "질문",
    my: "마이",
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
