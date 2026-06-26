<!-- 💡 팁: 아래 배지 위에 데모 GIF나 대시보드 스크린샷을 한 장 넣으면 첫인상이 크게 좋아집니다. -->

<div align="center">

# 🚀 SOS — Startup Operating System

### 아이디어 한 줄에서 사업계획서까지, 창업의 전 과정을 하나의 워크플로우로

**Turn a one-line idea into a fundable business plan — in a single AI-native workflow.**

아이디어 생성 · 시장조사 · 검증 · 전략분석 · 문서생성을 하나의 Knowledge Base 위에서 잇습니다.
사용자는 "GPT를 쓴다"가 아니라 **"창업을 진행한다"** 고 느낍니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-v6-000000?logo=vercel&logoColor=white)](https://sdk.vercel.ai/)
[![Google Gemini](https://img.shields.io/badge/Gemini-Free_tier-4285F4?logo=googlegemini&logoColor=white)](https://aistudio.google.com/)

</div>

> 💸 **무료로 동작합니다.** AI는 Google Gemini **무료 티어**(AI Studio)로 설정돼 있어, 신용카드 없이 채팅·문서·임베딩까지 전부 무료입니다. 유료 모델로 바꾸려면 `src/core/ai/policy.ts`의 모델 ID만 교체하면 됩니다(아키텍처는 프로바이더 무관).

---

## 🤔 왜 SOS인가

창업 초기의 진짜 병목은 "글을 못 써서"가 아니라 **맥락이 흩어지는 것**입니다. 아이디어·시장조사·SWOT·사업계획서가 각기 다른 툴과 대화에 흩어져, 같은 회사 설명을 매번 다시 입력하고, 좋은 분석은 다음 문서로 이어지지 않습니다.

SOS는 이 단절을 **하나의 Knowledge Base + 하나의 실행 파이프라인**으로 없앱니다. 한 번 입력한 지식 위에서 39가지 분석과 14종 문서가 서로를 근거로 이어지고, AI는 글을 대신 쓰는 도구가 아니라 **전략 컨설턴트·투자 심사역·PM·시장조사원**의 역할을 합니다.

설계 철학: **Prompt First · AI Native · Modular · Fast · Minimal · Beautiful**

---

## ✨ 핵심 기능

모든 화면은 `입력 → 분석 → 결과 → 다음 단계` 흐름을 따르고, 모든 기능은 재사용 가능한 모듈로 설계됩니다.

| 영역 | 설명 |
|------|------|
| 🧠 **Knowledge Base** | 프로젝트의 단일 진실. 서비스·시장·타겟·문제·솔루션·경쟁사·BM·USP를 한 번만 입력하면 모든 AI가 참조하고 자동 채움합니다. |
| 💡 **Idea Lab** (5) | Brainstorm · SCAMPER · Reverse Thinking · Random Combination · Pain Point Discovery |
| 🔭 **Research** (9) | TAM-SAM-SOM · 경쟁사 조사 · 시장 규모 · 트렌드 · 산업 분석 · 고객 조사 · 인터뷰 질문 · Reddit · 뉴스 분석 |
| ✅ **Validation** (4) | Problem / Solution Validation · PMF Score · Risk Analysis |
| 📊 **Analysis** (21) | SWOT · PEST(EL) · Porter 5 Forces · BCG · Value Chain · BMC · Lean Canvas · STP · 3C · 4P · JTBD · Customer Journey · Persona · Blue Ocean · Kano · AARRR · RICE · ICE · MoSCoW · 맥킨지 7S |
| 📄 **Documents** (14) | 창업패키지·TIPS·정부지원 사업계획서, 투자/IR Deck, 해커톤, 공모전, One Pager, Executive Summary, Pitch/발표 대본, MVP 기획서, PRD, 서비스 기획서 |
| ⚙️ **Workflows** (12) | 여러 모듈을 순서대로 자동 실행하는 프리셋 파이프라인. 끝에 문서까지 생성하거나 결과를 Project Memory에 축적 |
| 🧩 **Prompt Library** | System Prompt + Variables + Output Format으로 **커스텀 모듈**을 직접 제작·버전관리·팀 공유 |
| 🕸 **Project Memory** | 모든 결과가 서로를 인용(RAG)하며 쌓이는 연결망 |
| 💬 **AI Chat** | Knowledge Base를 맥락으로 한 프로젝트 전용 대화 |
| 🔍 **AI Reviewer** | 산출물을 투자자 등 다관점으로 검토 |
| 🛡 **Decision Gate** | AI 결과는 초안 — 사람이 *검증 완료 / 수정 필요 / 반려* 로 판단해야 다음 단계에 반영(Human-in-the-Loop) |
| 👥 **팀 협업** | 워크스페이스 단위 멤버 초대·역할(owner/member), Knowledge Base·모듈 공유 |

> 🔌 **AI-off 모드** — `NEXT_PUBLIC_AI_ENABLED=false`로 두면 AI 버튼이 숨겨지고 **프롬프트 복사 → 외부 LLM → 결과 붙여넣기** 수동 경로로 동작합니다.

**총 53개 시스템 모듈**(분석/리서치 39 + 문서 생성기 14)이 기본 제공됩니다. 모듈은 코드가 아니라 데이터로 정의되어 **새 모듈을 추가해도 UI 코드는 0**입니다.

---

## 🧠 핵심 개념

- **단일 Knowledge Base** — 같은 정보를 두 번 입력하지 않습니다. KB 값은 모든 모듈 폼에 자동 주입됩니다.
- **RAG 근거 기반** — 모듈·문서는 KB와 *이전 결과*를 근거로 사용합니다. 좋은 분석이 휘발되지 않고 다음 산출물의 토대가 됩니다.
- **Decision Gate** — AI는 속도, 사람은 판단. 검증된 결과만 신뢰 가능한 근거로 취급됩니다.
- **기능 = 데이터** — 프레임워크와 문서는 코드가 아니라 시드 데이터로 확장합니다.

---

## 🛠 기술 스택

| 레이어 | 사용 기술 |
|--------|-----------|
| 프레임워크 | **Next.js 16** (App Router, React Server Components) |
| 언어 | **TypeScript 5.7**, **React 19** |
| 스타일 | **Tailwind CSS v4**, **shadcn/ui** (Radix UI + CVA), `lucide-react`, `next-themes`, `cmdk`, `sonner` |
| 데이터·인증 | **Supabase** (Postgres + Auth), `@supabase/ssr` |
| AI | **Vercel AI SDK v6** (`ai`) + **Google Gemini** (`@ai-sdk/google`) |
| 검증·스키마 | **Zod** (입력/출력 스키마 강제) |
| RAG | Postgres `pgvector` (`halfvec(1536)` + HNSW) + Gemini 임베딩 |
| 문서 export | `docx`(Word), `pptxgenjs`(PowerPoint), `react-markdown` |

---

## 🚀 빠른 시작

### 사전 준비

- **Node.js 20+**
- [Supabase](https://supabase.com) 프로젝트 1개 (무료 플랜 OK) + [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Google AI Studio](https://aistudio.google.com/apikey) **무료 API 키** (카드 불필요)

### 설치 & 실행

```bash
git clone <repository-url> sos && cd sos
npm install
cp .env.example .env.local        # 값 채우기 (아래 환경변수)

# Supabase 스키마 적용 (택1)
supabase link --project-ref <YOUR_REF> && supabase db push   # 원격 프로젝트
# 또는 로컬 개발:  supabase start && supabase db reset

npm run seed                      # 시스템 모듈 시딩 (idempotent — 재실행 안전)
npm run dev                       # → http://localhost:3000
```

### 환경변수

`.env.local`에 다음 값을 채웁니다 (템플릿: [`.env.example`](./.env.example)).

| 변수 | 필수 | 설명 |
|------|:---:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | service_role key — **서버 전용, 절대 노출 금지** |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Google Gemini 무료 키 — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `EMBEDDING_MODEL` | — | 기본 `gemini-embedding-001` (1536차원) |
| `NEXT_PUBLIC_APP_URL` | — | 로컬은 `http://localhost:3000` |
| `NEXT_PUBLIC_AI_ENABLED` | — | 기본 `true`. `false`면 AI 기능을 숨기고 수동 모드 사용 |

### Supabase Auth (매직 링크)

비밀번호 없는 매직 링크 로그인입니다. 대시보드 → **Authentication → URL Configuration**:
**Site URL** `http://localhost:3000` · **Redirect URLs** `http://localhost:3000/auth/callback` (배포 시 운영 도메인도 추가).

---

## 🤖 AI 모델 & 비용

`src/core/ai/policy.ts`가 작업 난이도(`task_class`)별로 모델을 라우팅합니다 — 전부 Gemini 무료 모델:

| 용도 | 모델 |
|------|------|
| 추론 / 작성 | `gemini-2.5-flash` |
| 요약 / 분류 | `gemini-2.5-flash-lite` |
| 임베딩 / RAG | `gemini-embedding-001` (1536차원) |

무료 티어 한도(모델당 약 1,500요청/일)가 있으며, 모든 AI 호출은 **서버에서만** 일어나 키가 클라이언트에 노출되지 않습니다.

---

## 📜 명령어

```bash
npm run dev         # 개발 서버
npm run build       # 프로덕션 빌드
npm run start       # 프로덕션 실행
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run seed        # 시스템 모듈 시딩
```

---

## 🗂 프로젝트 구조

```
src/
├─ app/
│  ├─ (marketing)/      # 공개: /  ·  /login
│  ├─ (app)/            # 인증 영역: /home, /p/[project]/*, /w/[workspace]/team
│  └─ api/              # Route Handlers: runs(스트리밍) · documents · reviews · chat
├─ core/                # 도메인 코어 (UI 무관)
│  ├─ ai/               # 게이트웨이 · 모델 라우팅 · 임베딩
│  ├─ prompt-engine/    # 변수 해석 · 메시지 렌더 · 실행
│  ├─ rag/              # 청크 · 인덱싱 · 검색
│  ├─ modules/          # 모듈 카탈로그 + seed/ + guide.ts
│  └─ schemas/          # Zod 스키마
├─ server/              # 서버 액션 · 문서 생성 · 리뷰어
├─ components/          # ui/(shadcn) · app/(화면 컴포넌트)
└─ lib/                 # supabase · queries · utils

supabase/migrations/    # Postgres 스키마 (pgvector·RLS 포함)
```

기술 설계(아키텍처·DB 스키마·API)는 [`docs/`](./docs) 폴더를 참고하세요.

---

## 📦 주요 사용 흐름

> 로그인(매직 링크) → 워크스페이스·프로젝트 생성 → **Knowledge Base** 입력 → **모듈 실행**(스트리밍) → **결과 검증**(Decision Gate) → **원클릭 문서 생성** → Word·PowerPoint·Markdown 내보내기

여기에 AI Reviewer · Prompt Library(버전관리) · Workflows · Project Memory · AI Chat · 팀 협업이 한 워크스페이스 안에서 맞물려 동작합니다.

---

## 📄 라이선스

별도 라이선스가 명시되기 전까지 **All Rights Reserved**. 사용·재배포 문의는 저장소 소유자에게 부탁드립니다.

<div align="center">

—

**SOS** · 생각하는 시간을 줄이고, 더 좋은 의사결정을.

</div>
