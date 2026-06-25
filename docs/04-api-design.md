# 04 · API Design

> 데이터 모델은 [03](./03-database-schema.md), 실행 내부는 [05](./05-ai-prompt-engine.md).

---

## 1. 원칙: Server Actions 우선, 스트리밍만 Route Handler

Next.js App Router에서는 별도 REST 백엔드를 만들지 않는다.

| 종류 | 용도 | 이유 |
|------|------|------|
| **Server Components** | 모든 읽기(목록/상세) | RLS 쿼리를 서버에서 직접. API 왕복 없음 |
| **Server Actions** | mutation(생성/수정/삭제), 짧은 동기 작업 | 타입 안전, 폼 통합, BFF 불필요 |
| **Route Handlers (`/api/*`)** | **AI 스트리밍**, webhook, 파일/Export | SSE/스트림·외부 호출은 핸들러가 적합 |

모든 입력은 **Zod로 검증**(`core/schemas`), 모든 경계에서 인증/RLS 적용.

---

## 2. 공통 계약

### 2.1 인증
세션 쿠키(@supabase/ssr). 미인증 → Server Action은 `throw`, Route Handler는 `401`.

### 2.2 표준 에러 모델

```jsonc
// Route Handler 에러 응답
{ "error": { "code": "BUDGET_EXCEEDED", "message": "이번 달 토큰 예산을 초과했습니다.", "retryable": false } }
```

| code | HTTP | 의미 |
|------|------|------|
| `UNAUTHENTICATED` | 401 | 세션 없음 |
| `FORBIDDEN` | 403 | RLS/권한 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION` | 422 | Zod 실패(필드별 detail 포함) |
| `RATE_LIMITED` | 429 | 사용자 rate limit |
| `BUDGET_EXCEEDED` | 402 | 워크스페이스 토큰 예산 초과 |
| `PROVIDER_ERROR` | 502 | 모든 프로바이더 폴백 실패 |
| `INTERNAL` | 500 | 기타 |

Server Action은 동일 코드를 `{ ok:false, error }` 결과 객체로 반환(throw 대신 회복 가능 에러는 값으로).

### 2.3 멱등성
실행 트리거(`/api/runs`)는 `Idempotency-Key` 헤더 지원(중복 클릭/재시도 보호). 동일 키 24h 캐시.

---

## 3. Server Actions 카탈로그 (대표)

시그니처는 TS. 모두 `'use server'`, 내부에서 인증·Zod·RLS 적용.

```ts
// Workspace / Project
createWorkspace(input: { name: string }): Promise<Result<{ id: string }>>
createProject(input: { workspaceId: string; name: string; description?: string }): Promise<Result<{ id: string }>>
archiveProject(input: { projectId: string }): Promise<Result>

// Knowledge Base (자동 저장 — 디바운스 후 호출)
updateKnowledgeFields(input: { projectId: string; fields: Record<string,unknown> }): Promise<Result>
addKnowledgeEntry(input: { projectId: string; title?: string; body: string; sourceType?: string }): Promise<Result<{ id: string }>>
// 업로드는 Storage 직접 업로드 → 콜백으로 entry 생성 + 임베딩 큐

// Module / Prompt Template
createModule(input: { category: Category; name: string; description?: string }): Promise<Result<{ id: string }>>
savePromptVersion(input: {
  promptTemplateId: string; systemPrompt: string; instructions: string;
  variables: Variable[]; outputFormat: OutputFormat; examples: Example[]; changelog?: string;
}): Promise<Result<{ versionId: string; version: number }>>   // 새 버전 생성(불변), current 포인터 이동
setCurrentPromptVersion(input: { promptTemplateId: string; versionId: string }): Promise<Result> // 롤백/복원
publishModuleToWorkspace(input: { moduleId: string }): Promise<Result> // 팀 템플릿 마켓

// Artifact
pinArtifact(input: { artifactId: string; pinned: boolean }): Promise<Result>
rateArtifact(input: { artifactId: string; feedback: 1 | -1 }): Promise<Result>
saveArtifactToKnowledge(input: { artifactId: string }): Promise<Result> // 결과를 KB 항목으로 승격

// Document
createDocument(input: { projectId: string; docType: string; title: string }): Promise<Result<{ id: string }>>
saveDocumentVersion(input: { documentId: string; sections: Section[] }): Promise<Result<{ version: number }>>

// Workflow
saveWorkflow(input: { projectId: string; name: string; graph: WorkflowGraph }): Promise<Result<{ id: string }>>
```

`Result<T> = { ok: true; data: T } | { ok: false; error: ApiError }`

---

## 4. Route Handlers (스트리밍·생성·Export)

### 4.1 `POST /api/runs` — Module 실행 (SSE 스트리밍)

가장 중요한 엔드포인트. 내부 파이프라인은 [05 §3](./05-ai-prompt-engine.md).

**Request**

```jsonc
{
  "projectId": "uuid",
  "moduleId": "uuid",
  "inputs": { "market": "...", "tone": "전문적", "length": 3, "language": "ko" },
  "useRag": true
}
```

**처리 순서**
1. 인증 + RLS 권한 + **예산 체크**(초과 시 402).
2. `runs` row 생성(`status=running`).
3. `prompt_version` + `knowledge_base.fields` 로드, 변수 해석(`kb:` 자동 주입).
4. `useRag`면 `match_chunks`로 컨텍스트 + 출처 수집.
5. AI Gateway로 `streamText`(markdown) 또는 `streamObject`(structured).
6. **SSE로 토큰/부분객체 스트림.**
7. 종료 시 출력 검증(Zod) → `artifacts` 저장 → `runs` 완료(tokens/cost) → `graph_edges`(derived_from/cites) 기록 → 임베딩 큐.

**SSE 이벤트**

```
event: meta     data: { "runId":"...", "model":"claude-sonnet-4-6", "sources":[...] }
event: delta    data: { "text":"..." }          // 또는 부분 객체
event: done     data: { "artifactId":"...", "tokens":{"in":1200,"out":2400}, "cost":0.018 }
event: error    data: { "code":"PROVIDER_ERROR", "message":"..." }
```

클라이언트는 AI SDK의 `useChat`/`useObject` 또는 `EventSource`로 소비.

### 4.2 `POST /api/documents/generate` — 원클릭 문서

```jsonc
{ "projectId":"uuid", "docType":"biz_plan", "preset":"government", "language":"ko" }
```

문서 템플릿(섹션 정의)을 따라 섹션별로 Module을 연쇄 실행하며 **섹션 단위로 스트리밍**. 완료 시 `documents` + `document_versions(v1)` 생성. 길면 비동기 모드(아래 4.4)로 폴백.

### 4.3 `POST /api/workflows/:id/run` — 워크플로우 실행
DAG 위상정렬 → 노드별 `run` 생성 → 의존성 만족 시 실행. 진행상황은 **Supabase Realtime**(`workflow_runs.step_states`)으로 구독. (Phase 5; durable 실행은 Inngest 도입.)

### 4.4 `POST /api/reviews` — AI Reviewer

```jsonc
{ "targetType":"document", "targetId":"uuid", "personas":["investor","judge","customer","competitor"] }
```

페르소나별 평가 Module 병렬 실행 → `reviews` 저장(점수·강점·약점·제안).

### 4.5 Export
`GET /api/export/document/:versionId?format=md|pdf|pptx` — `body_md`에서 변환. PDF/PPTX는 서버 변환(스킬/라이브러리). 서명 URL 반환.

### 4.6 Webhooks / Cron
- `POST /api/webhooks/storage` — 업로드 완료 → 청킹·임베딩 큐.
- `GET /api/cron/embeddings`(Vercel Cron) — 미처리 임베딩 배치 처리.

---

## 5. 버전 관리 API 패턴

프롬프트·문서 모두 **불변 버전 + current 포인터** 패턴.

- 저장 = 새 `*_versions` row(append-only). 기존 버전 변경 없음.
- 복원 = `setCurrent*Version`으로 포인터 이동(데이터 손실 없음).
- Diff = 두 버전 id를 받아 서버에서 텍스트/구조 diff 계산:
  `GET /api/diff?type=prompt&a=<vid>&b=<vid>` → 라인/필드 단위 diff JSON.

---

## 6. Rate Limiting & 비용

- **사용자 단위:** 슬라이딩 윈도우(예 30 runs/min) — Upstash 또는 메모리(MVP).
- **워크스페이스 단위:** `token_budget_monthly` 사전 체크 + 트리거 사후 집계([03 §6](./03-database-schema.md)).
- **응답 헤더:** `X-RateLimit-Remaining`, `X-Token-Budget-Remaining`.
- 초과 시 UI는 업그레이드/대기 안내(파괴적 실패 금지).

---

## 7. 입력 검증 (Zod 공유 스키마)

`core/schemas`에 정의해 **Server Action·Route Handler·클라이언트 폼이 같은 스키마 공유**.

```ts
export const RunInput = z.object({
  projectId: z.string().uuid(),
  moduleId: z.string().uuid(),
  inputs: z.record(z.unknown()),
  useRag: z.boolean().default(true),
});
export type RunInput = z.infer<typeof RunInput>;
```

변수별 세부 검증은 `prompt_version.variables` 정의로 **동적 Zod 생성**(타입/required/min·max)하여 실행 직전 한 번 더 검증.

---

## 8. 표준 응답 시간 목표

| 엔드포인트 | 목표 |
|------------|------|
| Server Action(mutation) | p95 < 300ms |
| `/api/runs` 첫 토큰 | p95 < 3s |
| `/api/runs` 완료 | 평균 < 30s |
| Export(PDF) | < 8s |
