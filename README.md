# SOS — Startup Operating System

아이디어 검증부터 사업계획서까지를 하나의 워크플로우로 연결하는 AI 창업 운영체제.
설계 문서는 [`docs/`](./docs/00-README.md) 참고. 본 README는 개발 셋업 가이드입니다.

스택: **Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase · Vercel AI SDK v6 + Google Gemini(무료)**

> 💸 **무료 운영**: AI는 Google Gemini **무료 티어**(AI Studio)로 설정돼 있습니다. 신용카드 없이 채팅·문서·임베딩까지 전부 무료로 돌아갑니다.

---

## 1. 사전 준비

- Node.js **20+**
- [Supabase](https://supabase.com) 프로젝트 1개 (무료 플랜 OK)
- [Google AI Studio](https://aistudio.google.com/apikey) **무료 API 키** (카드 불필요)

## 2. 설치 & 실행

```bash
npm install
cp .env.example .env.local        # 값 채우기 (§3)
supabase link --project-ref <ref> && supabase db push   # 또는 로컬: supabase db reset
npm run seed                      # 52개 시스템 모듈 주입
npm run dev                       # http://localhost:3000
```

## 3. 환경변수 (`.env.local`)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**서버 전용**) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini 무료 키 — aistudio.google.com/apikey |
| `EMBEDDING_MODEL` | 기본 `gemini-embedding-001` (1536차원, 비워둬도 됨) |
| `NEXT_PUBLIC_APP_URL` | 로컬은 `http://localhost:3000` |

## 4. Supabase Auth (매직 링크)

대시보드 → Authentication → URL Configuration:
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback` (배포 시 운영 도메인도 추가)

## 5. AI 모델 (무료 티어)

`src/core/ai/policy.ts`에서 작업 난이도별 모델을 라우팅합니다 — 전부 Gemini 무료 모델:
- 추론/작성: `gemini-2.5-flash`
- 요약/분류(light): `gemini-2.5-flash-lite`
- 임베딩(RAG): `gemini-embedding-001` → 1536차원 출력으로 DB `halfvec(1536)`와 일치

무료 티어 한도(모델당 약 1,500요청/일)가 있습니다. 나중에 유료 모델로 바꾸려면 `policy.ts`의 model id만 교체하면 됩니다(아키텍처는 프로바이더 무관).

## 6. 지금 동작하는 것 (전체 기능 구현 완료)

로그인(매직링크) → 워크스페이스/프로젝트 → **Knowledge Base** → **Module Runner**(52개 모듈, 스트리밍) → 결과 저장 → **원클릭 문서**(14종) → **AI 리뷰**(4관점) · **Library/Prompt Builder**(버전관리) · **Workflows**(프리셋 파이프라인) · **Project Memory** · **AI Chat** · **팀 초대/역할**.

## 7. 명령어

```bash
npm run dev         # 개발 서버
npm run build       # 프로덕션 빌드
npm run start       # 프로덕션 실행
npm run typecheck   # 타입 검사
npm run seed        # 시스템 모듈 시딩
```

## 8. 프로젝트 구조 (요약)

```
src/
├─ app/(marketing)/        # /  ·  /login
├─ app/(app)/              # 인증 영역: /home, /p/[project]/*, /w/[workspace]/team, /join
├─ app/api/                # runs(스트리밍) · documents/generate · reviews · chat
├─ core/                   # 도메인 코어: ai · prompt-engine · rag · modules(시드) · schemas
├─ server/                 # 엔진 · 문서생성 · 리뷰어 · 서버 액션
├─ components/             # ui(shadcn) · app(화면 컴포넌트)
└─ lib/                    # supabase · queries · utils
```

전체 설계는 [`docs/02-architecture.md`](./docs/02-architecture.md).

## 9. 트러블슈팅

- **AI 응답이 안 와요:** `GOOGLE_GENERATIVE_AI_API_KEY`가 채워졌는지, 무료 한도(요청/일)를 넘지 않았는지 확인.
- **로그인 링크 미수신:** Supabase Auth Redirect URLs에 `/auth/callback` 등록 확인.
- **임베딩 차원 오류:** `EMBEDDING_MODEL`을 바꿨다면 출력 차원이 1536이어야 합니다(아니면 마이그레이션의 `halfvec(1536)`·HNSW 인덱스도 변경).
