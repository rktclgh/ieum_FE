# 회원가입(join) 기능 설계

**백엔드**: [ieum_BE](https://github.com/rktclgh/ieum_BE) (로컬 `./gradlew :app-main:bootRun`, 포트 8080)
**Swagger**: http://localhost:8080/swagger-ui/index.html
**인증 방식**: http-only 쿠키 세션 (signup 자체는 비인증 엔드포인트)

관련 엔드포인트:
- `POST /api/v1/auth/email/check-duplicate`
- `POST /api/v1/auth/email/send-code`
- `POST /api/v1/auth/email/verify`
- `POST /api/v1/auth/nickname/check-duplicate`
- `POST /api/v1/auth/signup`

백엔드가 이미 존재하고 Swagger로 문서화되어 있으므로, 인터페이스/Mock 어댑터 분리 없이 **단일 `auth-api.ts`**로 충분하다고 판단했다. (백엔드가 아직 없는 도메인에 한해 포트+Mock 어댑터 패턴을 적용 — 이 기능에는 해당하지 않음)

## 파일 구조

```
src/
├─ lib/
│  └─ api/
│     └─ client.ts                   # axios 인스턴스 — baseURL: NEXT_PUBLIC_API_BASE_URL, withCredentials: true
│
└─ features/
   └─ join/
      ├─ api/
      │  └─ auth-api.ts              # checkEmailDuplicate / sendEmailVerificationCode /
      │                              # verifyEmailVerificationCode / checkNicknameDuplicate / signup
      │                              # client.ts를 바로 사용 — interface/adapter 분리 없음 (백엔드 이미 존재)
      │
      ├─ hooks/
      │  ├─ use-join-mutations.ts    # 위 5개 함수를 react-query useMutation으로 묶어서 반환
      │  └─ use-join-flow.ts         # 핵심 — 1·2단계 상태 통합 + 변환 + 제출까지 오케스트레이션
      │
      ├─ lib/
      │  ├─ nationality-map.ts       # slug('united-states') → ISO2('US') 매핑 테이블
      │  └─ format.ts                # birthDate 'YYYY.MM.DD' → 'YYYY-MM-DD' 변환
      │
      ├─ types.ts                   # SignupRequest, JoinFormState, JoinApiError 등
      │
      └─ components/
         ├─ credentials-form.tsx     # use-join-flow의 값/핸들러만 받아 렌더 — placeholder 로직 없음
         └─ profile-form.tsx         # 위와 동일

app/
└─ join/
   └─ page.tsx                       # use-join-flow() 한 번 호출 + 두 폼 조립만
```

## 폴더/파일 판단 근거

| 파일 | 두는 이유 |
|---|---|
| `lib/api/client.ts` | axios 인스턴스는 앱 전역에서 공유 — 프로젝트에 이미 있는 `lib/query`, `lib/i18n`과 같은 급의 전역 인프라 |
| `features/join/api/auth-api.ts` | 백엔드가 이미 존재/안정적이므로 포트-어댑터 분리 없이 얇은 함수 모음으로 충분 |
| `features/join/hooks/use-join-flow.ts` | 지금 문제(placeholder 인증코드 생성, `TAKEN_NICKNAMES` 로컬 체크, 1·2단계 state 분산)의 원인은 폼 로직이 컴포넌트 3곳에 흩어진 것 — 훅 하나로 모아 컴포넌트를 순수 렌더링으로 되돌림 |
| `features/join/lib/nationality-map.ts`, `format.ts` | 변환 로직이 필요한 도메인이 지금은 join 하나뿐 — 두 번째 도메인이 필요로 하는 시점에만 전역 `src/lib/`로 승격 |

## `use-join-flow.ts` 설계

```ts
export const useJoinFlow = () => {
  const { language } = useTranslation();               // 기존 i18n 시스템 재사용
  const [step, setStep] = useState<1 | 2>(1);
  const [credentials, setCredentials] = useState({ email: '', password: '', emailVerificationToken: '' });
  const [profile, setProfile] = useState({ nickname: '', birthDate: '', gender: '', nationality: '' });

  const { sendCode, verifyCode, checkEmail, checkNickname, signup } = useJoinMutations();

  const handleSignup = async () => {
    const payload: SignupRequest = {
      ...credentials,
      ...profile,
      birthDate: toIsoDate(profile.birthDate),          // features/join/lib/format.ts
      nationality: toIso2(profile.nationality),          // features/join/lib/nationality-map.ts
      language,
    };
    return signup.mutateAsync(payload);
  };

  return {
    step, setStep,
    credentials, setCredentials,
    profile, setProfile,
    checkEmail, sendCode, verifyCode, checkNickname, handleSignup,
  };
};
```

`credentials-form.tsx` / `profile-form.tsx`는 이 훅의 반환값만 props로 받고, 검증·변환·API 호출 코드를 갖지 않는다.

## 에러 처리

이미 존재하는 `lib/i18n/messages`를 그대로 활용해 API 에러도 다국어 대응한다.

```
features/join/lib/errors.ts
  → { EMAIL_DUPLICATE: 'emailDuplicate', CODE_EXPIRED: 'codeExpired', ... } 형태로
    백엔드 에러코드 → messages 키 매핑만 담당
```

`use-join-mutations.ts`의 각 `onError`에서 이 매핑을 거쳐 `messages[language][key]`를 최종 에러 문구로 반환한다.

## 적용 순서

1. `lib/api/client.ts` — axios 인스턴스
2. `features/join/api/auth-api.ts` — 5개 API 함수
3. `features/join/hooks/use-join-mutations.ts` — react-query 훅
4. `features/join/lib/nationality-map.ts`, `format.ts` — 변환 유틸
5. `features/join/hooks/use-join-flow.ts` — 오케스트레이션
6. `credentials-form.tsx`, `profile-form.tsx`, `app/join/page.tsx` — 훅 연결, placeholder 제거
