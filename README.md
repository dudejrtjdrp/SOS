<div align="center">

# 🚀 SOS — Startup Operating System

**아이디어 한 줄에서 사업계획서까지, 창업의 전 과정을 하나의 워크플로우로 잇는 AI 운영체제**

아이디어 생성 · 시장조사 · 검증 · 전략분석 · 문서생성을 단일 Knowledge Base 위에서 연결합니다.
사용자는 "GPT를 쓴다"가 아니라 **"창업을 진행한다"** 고 느낍니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-v6-000000?logo=vercel&logoColor=white)](https://sdk.vercel.ai/)
[![Google Gemini](https://img.shields.io/badge/Gemini-Free_tier-4285F4?logo=googlegemini&logoColor=white)](https://aistudio.google.com/)

</div>

> 💸 **무료로 돌아갑니다.** AI는 Google Gemini **무료 티어**(AI Studio)로 설정돼 있어, 신용카드 없이 채팅·문서·임베딩까지 전부 무료입니다. 유료 모델로 바꾸려면 `src/core/ai/policy.ts`의 모델 ID만 교체하면 됩니다(아키텍처는 프로바이더 무관).

---

## 목차

- [핵심 기능](#-핵심-기능)
- [핵심 개념](#-핵심-개념)
- [기술 스택](#-기술-스택)
- [빠른 시작](#-빠른-시작)
- [환경변수](#-환경변수)
- [Supabase Auth 설정](#-supabase-auth-설정)
- [AI 모델 & 비용](#-ai-모델--비용)
- [명령어](#-명령어)
- [프로젝트 구조](#-프로젝트-구조)
- [데이터베이스](#-데이터베이스)
- [설계 문서](#-설계-문서)
- [현재 상태](#-현재-상태)
- [라이선스](#-라이선스)

---

## ✨ 핵심 기능

모든 기능은 **재사용 가능한 모듈**로 설계되고, 모든 화면은 `입력 → 분석 → 결과 → 다음 단계` 흐름을 따릅니다.

| 영역 | 설명 |
|------|------|
| 🧠 **Knowledge Base** | 프로젝트의 단일 진실. 서비스·시장·타겟·문제·솔루션·경쟁사·BM·USP 등을 한 번만 입력하면 모든 AI가 참조하고 자동 채움합니다. |
| 💡 **Idea Lab** (5) | Brainstorm · SCAMPER · Reverse Thinking · Random Combination · Pain Point Discovery |
| 🔭 **Research** (9) | TAM-SAM-SOM · 경쟁사 조사 · 시장 규모 · 트렌드 · 산업 분석 · 고객 조사 · 인터뷰 질문 · Reddit · 뉴스 분석 |
| ✅ **Validation** (4) | Problem / Solution Validation · PMF Score · Risk Analysis |
| 📊 **Analysis** (21) | SWOT · PEST(EL) · Porter 5 Forces · BCG · Value Chain · BMC · Lean Canvas · STP · 3C · 4P · JTBD · Customer Journey · Persona · Blue Ocean · Kano · AARRR · RICE · ICE · MoSCoW · 맥킨지 7S |
| 📄 **Documents** (14) | 창업패키지·TIPS·정부지원 사업계획서, 투자/IR Deck, 해커톤, 공모전, One Pager, Executive Summary, Pitch/발표 대본, MVP 기획서, PRD, 서비스 기획서 |
| ⚙️ **Workflows** (12) | 여러 모듈을 순서대로 자동 실행하는 프리셋 파이프라인. 끝에 문서까지 생성하거나 Project Memory에 결과를 축적 |
| 🧩 **Prompt Library** | System Prompt + Variables + Output Format으로 **커스텀 모듈**을 직접 제작·버전관리·팀 공유 |
| 🕸 **Project Memory** | 모든 결과가 서로를 인용(RAG)하며 쌓이는 연결망 |
| 💬 **AI Chat** | KB를 맥락으로 한 프로젝트 전용 대화 |
| 🔍 **AI Reviewer** | 산출물을 투자자 등 다관점으로 검토 |
| 🛡 **Decision Gate** | AI 결과는 초안 — 사람이 *검증 완료 / 수정 필요 / 반려* 로 판단해야 다음 단계에 반영(Human-in-the-Loop) |
| 👥 **팀 협업** | 워크스페이스 단위 멤버 초대·역할(owner/member), KB·모듈 공유 |

> **AI-off 모드:** `NEXT_PUBLIC_AI_ENABLED=false`로 두면 모든 AI 버튼이 숨겨지고, **프롬프트 복사 → 외부 LLM → 결과 붙여넣기** 수동 경로로 동작합니다(사내 정책·레이트리밋 대응).

총 **53개 시스템 모듈** = 분석/리서치 39개 + 문서 생성기 14종. 모듈은 데이터(`prompt_versions`)로 정의되어 **새 모듈을 추가해도 UI 코드는 0**입니다.

---

## 🧠 핵심 개념

- **단일 Knowledge Base** — 같은 정보를 두 번 입력하지 않습니다. KB 값은 모든 모듈 폼에 자동 주입됩니다.
- **RAG 근거 기반** — 모듈·문서는 KB와 *이전 결과*를 근거로 사용합니다. 결과가 휘발되지 않고 다음 산출물의 토대가 됩니다.
- **Decision Gate** — AI는 속도, 사람은 판단. 검증된 결과만 신뢰 가능한 근거로 취급됩니다.
- **기능 = 데이터** — 프레임워크/문서는 코드가 아니라 시드 데이터로 늘립니다.

설계 철학: **Prompt First · AI Native · Modular · Fast · Minimal · Beautiful**

---

## 🛠 기술 스택

| 레이어 | 사용 기술 |
|--------|-----------|
| 프레임워크 | **Next.js 16** (App Router, React Server Components) |
| 언어 | **TypeScript 5.7**, **React 19** |
| 스타일 | **Tailwind CSS v4**, **shadcn/ui** (Radix UI + CVA), `lucide-react`, `next-themes`(다크모드), `cmdk`(커맨드 팔레트), `sonner`(토스트) |
| 데이터·인증 | **Supabase** (Postgres + Auth), `@supabase/ssr`, `@supabase/supabase-js` |
| AI | **Vercel AI SDK v6** (`ai`) + **Google Gemini** (`@ai-sdk/google`) |
| 검증·스키마 | **Zod** (입력/출력 스키마 강제) |
| RAG | Postgres `pgvector` (`halfvec(1536)` + HNSW), Gemini 임베딩 |
| 문서 export | `docx`(Word), `pptxgenjs`(PowerPoint), `react-markdown`+`remark-gfm` |
| 시드 | `tsx` 런타임 (`supabase/seed.ts`) |

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

npm run seed                      # 53개 시스템 모듈 시딩 (idempotent — 재실행 안전)
npm run dev                       # → http://localhost:3000
```

---

## 🔑 환경변수

`.env.local`에 다음 값을 채웁니다 (템플릿: [`.env.example`](./.env.example)).

| 변수 | 필수 | 설명 |
|------|:---:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | service_role key — **서버 전용, 절대 노출 금지** (시딩에 필요) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Google Gemini 무료 키 — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `EMBEDDING_MODEL` | — | 기본 `gemini-embedding-001` (1536차원, 비워도 됨) |
| `NEXT_PUBLIC_APP_URL` | — | 로컬은 `http://localhost:3000` (Auth 리다이렉트용) |
| `NEXT_PUBLIC_AI_ENABLED` | — | 기본 `true`. `false`면 AI 기능을 숨기고 수동(프롬프트 복사) 경로 사용 |

---

## 🔐 Supabase Auth 설정

비밀번호 없는 **매직 링크** 로그인입니다. 대시보드 → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback` (배포 시 운영 도메인도 추가)

---

## 🤖 AI 모델 & 비용

`src/core/ai/policy.ts`가 작업 난이도(`task_class`)별로 모델을 라우팅합니다 — 전부 Gemini 무료 모델:

| 용도 | 모델 |
|------|------|
| 추론 / 작성 (reasoning, drafting) | `gemini-2.5-flash` |
| 요약 / 분류 (light) | `gemini-2.5-flash-lite` |
| 임베딩 / RAG | `gemini-embedding-001` → 1536차원, DB `halfvec(1536)`와 일치 |

무료 티어 한도(모델당 약 1,500요청/일)가 있습니다. 모든 AI 호출은 **서버에서만** 일어나며 키는 클라이언트에 노출되지 않습니다.

---

## 📜 명령어

```bash
npm run dev         # 개발 서버 (http://localhost:3000)
npm run build       # 프로덕션 빌드
npm run start       # 프로덕션 실행
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit (타입 검사)
npm run seed        # 시스템 모듈 시딩 (supabase/seed.ts)
```

---

## 🗂 프로젝트 구조

```
src/
├─ app/
│  ├─ (marketing)/      # 공개: /  ·  /login
│  ├─ (app)/            # 인증 영역: /home, /p/[project]/*, /w/[workspace]/team, /join
│  └─ api/              # Route Handlers: runs(스트리밍) · documents/generate · reviews · chat
├─ core/                # 도메인 코어 (UI 무관, 순수 로직)
│  ├─ ai/               # 게이트웨이 · 모델 라우팅(policy.ts) · 임베딩
│  ├─ prompt-engine/    # 변수 해석 · 메시지 렌더 · 멀티 프로바이더 실행
│  ├─ rag/              # 청크 · 인덱싱 · 검색(retrieve)
│  ├─ modules/          # 모듈 카탈로그 + seed/(idea·research·validation·analysis·documents) + guide.ts
│  └─ schemas/          # Zod 스키마 (KB·입력·출력)
├─ server/              # 서버 액션 · 문서 생성 · 리뷰어
├─ components/          # ui/(shadcn) · app/(사이드바·모듈·워크플로우 화면)
└─ lib/                 # supabase 클라이언트 · queries · utils · flags

supabase/
├─ migrations/          # 0001 → 0008 스키마
└─ seed.ts              # 시스템 모듈 시딩

docs/                   # 00~09 설계 문서 (아래 표)
```

전체 설계는 [`docs/02-architecture.md`](./docs/02-architecture.md) 참고.

---

## 🗄 데이터베이스

`supabase/migrations/`를 순서대로 적용합니다.

| 마이그레이션 | 내용 |
|------|------|
| `0001_extensions_helpers.sql` | `pgcrypto`, `pgvector`(RAG) 확장 + 헬퍼 |
| `0002_identity_workspaces.sql` | profiles · workspaces · workspace_members · team_invites |
| `0003_projects_knowledge.sql` | projects · knowledge_bases · knowledge_entries |
| `0004_modules_runs.sql` | modules · prompt_templates · prompt_versions · runs · artifacts |
| `0005_documents_workflows.sql` | documents · document_versions · workflows · workflow_runs |
| `0006_rag_reviews.sql` | embeddings(`halfvec(1536)`+HNSW) · graph_edges · reviews |
| `0007_rls_policies.sql` | Row-Level Security 정책 (워크스페이스 격리) |
| `0008_human_in_the_loop.sql` | 검증 상태(verification_status) · 내 판단(founder_take) · Decision Gate |

---

## 📚 설계 문서

`docs/`에 전체 제품·기술 설계가 정리돼 있습니다.

| # | 문서 | 내용 |
|---|------|------|
| 00 | [README](./docs/00-README.md) | 용어·멘탈 모델·읽는 순서 |
| 01 | [PRD](./docs/01-PRD.md) | 비전·페르소나·기능 범위·성공 지표 |
| 02 | [Architecture](./docs/02-architecture.md) | 시스템 설계·기술 스택 |
| 03 | [Database Schema](./docs/03-database-schema.md) | 스키마·ERD·RLS |
| 04 | [API Design](./docs/04-api-design.md) | 서버 액션·스트리밍 계약 |
| 05 | [AI Prompt Engine](./docs/05-ai-prompt-engine.md) | 프롬프트 엔진·RAG·워크플로우 ⭐ |
| 06 | [UX & Screens](./docs/06-ux-and-screens.md) | 정보구조·화면·디자인 시스템 |
| 07 | [Roadmap](./docs/07-roadmap.md) | MVP 로드맵·컷라인·비용 |
| 08 | [Human-in-the-Loop](./docs/08-human-in-the-loop.md) | 검증·Decision Gate 설계 |
| 09 | [Improvement & Review](./docs/09-improvement-review.md) | 개선·리뷰 로드맵 |

---

## 🏁 현재 상태

핵심 루프가 **end-to-end로 동작**합니다:

> 로그인(매직 링크) → 워크스페이스·프로젝트 → **Knowledge Base** → **모듈 실행**(53개, 스트리밍) → **결과 검증**(Decision Gate) → **원클릭 문서**(14종) → Word·PowerPoint·Markdown Export

추가로 **AI Reviewer · Prompt Library(버전관리) · Workflows(12 프리셋) · Project Memory · AI Chat · 팀 초대/역할 · AI-off 수동 모드**까지 구현되어 있습니다.

---

## 📄 라이선스

별도 라이선스가 명시되기 전까지 **All Rights Reserved** (사용·재배포 전 저장소 소유자에게 문의).

<div align="center">

—

**SOS** · 생각하는 시간을 줄이고, 더 좋은 의사결정을.

</div>
