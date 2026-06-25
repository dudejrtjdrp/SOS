# 09 · 제품 개선 리뷰 (PM·기획·디자인·개발 통합 관점)

> 작성: 2026-06-25 · 방법: 배포 인스턴스 대신 **실제 코드 경로를 화면 단위로 추적**(로그인→KB→모듈 실행→검증→문서→워크플로우→팀)하며 사용자 여정을 시뮬레이션. 모든 항목은 근거 파일을 명시.

---

## 0. 한 줄 총평

**아키텍처와 핵심 루프(모듈 실행 → HITL 검증 → KB/문서)는 시니어 수준으로 잘 짜여 있다.** 지금 부족한 건 "기술"이 아니라 **약속한 결과물의 마지막 1마일** — 즉 *투자자에게 보낼 수 있는 형태의 문서(PDF·Deck)*, *영속성(채팅·문서 편집)*, *무료티어에서의 실패 복원력*이다. 데모는 되지만, "사업계획서를 끝까지 뽑아 제출한다"는 핵심 약속이 마지막 단계에서 끊긴다.

---

## 1. 잘 되어 있는 것 (유지·강화)

- **프롬프트 엔진의 순수성** — `plan/resolve/render`가 DB 오케스트레이션과 분리(`core/prompt-engine/*`)되어 테스트·교체가 쉬움. 프로바이더 무관(`core/ai/policy.ts`).
- **HITL 결정 게이트** — 검증/수정 필요/반려 + "내 판단(Founder's Take)"이 단일 모듈 실행에 잘 구현됨(`module-runner.tsx`). 이게 GPT 래퍼와의 진짜 차별점.
- **수동 폴백** — 프롬프트 복사 → 외부 AI 실행 → 결과 붙여넣기가 단일 실행·워크플로우 양쪽에 배선됨(`workflow-runner.tsx`, `actions/module.ts`). 무료티어 현실을 반영한 영리한 설계.
- **RAG 근거 + 출처** — 인용 엣지(`graph_edges: cites`)와 출처 배지, 문서 생성도 RAG 그라운딩(`server/documents.ts`).
- **KB Quick Panel** — 모든 화면에서 열리는 디바운스 자동저장·필드별 복사. 마찰 제거가 탁월(`kb-quick-panel.tsx`).
- **보안** — 기본 차단 RLS + `SECURITY DEFINER` 헬퍼(`migrations/0007`). IDOR를 RLS로 차단.
- **프롬프트 버전관리** — 저장/복원/팀 공유(`prompt-builder.tsx`).

---

## 2. 우선순위별 개선 항목

### 🔴 P0 — 핵심 약속이 끊기는 지점 (지금 가장 먼저)

**P0-1. 문서 Export가 `.md` 한 가지뿐**
- 증상: 사업계획서·IR Deck을 만들어도 나가는 형식은 raw 마크다운뿐. 심사위원·투자자에게 그대로 못 보냄.
- 근거: `document-actions.tsx`의 `exportMd()`만 존재. 로드맵(`docs/07`)도 PDF(Phase 3)·PPTX(Phase 5)를 "예정"으로만 둠.
- 처방: **서버 변환으로 PDF + DOCX 우선** 추가(사업계획서·기획서류). 이게 "결과물 제출"이라는 제품 정체성의 마지막 1마일.

**P0-2. "Deck"이 슬라이드가 아니라 산문**
- 증상: IR Deck / 투자용 Deck / 발표 대본이 markdown 프로즈로 생성됨. 슬라이드 구조·PPTX 없음.
- 근거: `seed/documents.ts`는 섹션 텍스트만 생성, 슬라이드 모델 부재.
- 처방: Deck류는 슬라이드 스키마(제목/불릿/스피커노트)로 분리 생성 → **PPTX 출력**. 최소한 1슬라이드=1섹션 매핑부터.

**P0-3. 생성된 문서를 앱에서 편집할 수 없음**
- 증상: 문서 뷰는 읽기 전용(재생성 or .md 내보내기뿐). 실제 사업계획서는 반드시 손봐야 함.
- 근거: `documents/[doc]/page.tsx`에 편집 UI 없음. 수동 조립기(`document-composer.tsx`)는 "아티팩트 조립" 전용이라 이미 생성된 문서를 못 불러옴.
- 처방: 문서 뷰어에 **인라인 편집 + 버전 저장**(이미 `document_versions` 스키마 있음 — UI만 연결).

### 🟠 P1 — 차별화 원칙의 일관성 / 신뢰성

**P1-1. HITL 게이트가 워크플로우에선 우회됨**
- 증상: 단일 실행은 "검증해야 다음 단계"인데, 워크플로우는 전 단계를 자동 실행하고 `needs_review` 아티팩트 그대로 문서를 생성. 제품의 시그니처 원칙(사람이 통과시켜야 넘어간다)이 자동 경로에서 깨짐.
- 근거: `workflow-runner.tsx`가 결과를 스트림만 비우고 게이트 없이 다음 step → `runDoc()`.
- 처방: 핵심 게이트(리서치 수치·고객검증)에서 **일시정지 후 검증**하거나, 최소한 워크플로우 산출물을 "미검증 초안"으로 명확히 라벨.

**P1-2. 모델 폴백 체인이 정의만 되고 미연결**
- 증상: `selectModel`이 `fallback` 배열을 돌려주지만 **아무도 안 씀**. 429/일시오류 시 run이 그냥 실패. 무료티어 RPM·일일한도에서 자주 터질 지점.
- 근거: `core/ai/policy.ts`의 `FALLBACK_CHAIN`을 `engine.ts`·`documents.ts`·`reviewer.ts`·`chat/route.ts` 어디서도 순회하지 않음.
- 처방: 실행 경로에 **flash → flash-lite 자동 폴백** 배선(수동 붙여넣기 UX는 최후수단으로 유지).

**P1-3. 토큰 예산 집계가 run에만 적용**
- 증상: `tokens_used_current`는 `runs` 트리거로만 증가(`migrations/0004`). 그런데 **채팅·리뷰·문서 생성은 run 행을 안 만들고** LLM 직접 호출 → 토큰 미집계. 게다가 `/api/reviews`는 예산 체크 자체가 없음(추론모델 4회 호출).
- 근거: `chat/route.ts`·`reviewer.ts`·`documents.ts`가 run을 생성하지 않음. `reviews/route.ts`에 `withinBudget` 없음.
- 처방: 모든 LLM 호출을 run 회계로 통일하거나 usage 원장 추가 + 리뷰 라우트에 예산 가드.

**P1-4. 문서 생성이 섹션 병렬이라 부분 실패에 취약**
- 증상: `Promise.all`로 전 섹션 동시 생성 → 한 섹션이 rate-limit이면 **전체 실패, 저장 0**.
- 근거: `server/documents.ts` `generateDocument`의 `Promise.all`.
- 처방: `allSettled`로 부분 보존 + 실패 섹션만 재시도/폴백.

### 🟡 P2 — UX·디자인 폴리시 / 정합성

**P2-1. AI Chat 비영속** — 새로고침 시 대화 전체 소실(`chat-panel.tsx`는 React state만, 라우트도 저장 안 함). "AI 파트너" 포지셔닝과 충돌 → 스레드 DB 저장.

**P2-2. RAG 자료가 텍스트 붙여넣기 전용** — KB 페이지는 "업로드"라 안내하지만 실제론 textarea뿐(`kb-editor.tsx` `AddKnowledgeEntry`). 파일 업로드·파싱(PDF/CSV) 없음, 항목 삭제도 없음 → 파일 인입 추가.

**P2-3. 시각화 편차** — 12개 모듈만 전용 viz, 나머지는 raw JSON(`viz/registry.ts` vs `structured-result.tsx`). "Beautiful/생성형 UI" 지향 대비 공통 폴백 렌더러 품질 상향 필요.

**P2-4. 죽은 코드** — `components/app/sidebar.tsx`(AppSidebar)는 어디서도 import 안 됨(현재 `ProjectSidebar` 사용). "Phase 1/2 준비 중" 토스트가 실제 배포된 페이지와 모순 → 삭제.

**P2-5. 온보딩 빈 상태 약함** — 새 프로젝트(KB 0%)에서 "무엇부터"의 단일 동선이 약함 → "KB 3필드만 채우면 SWOT 데모" 같은 first-run 트랙.

**P2-6. 로그인 마찰** — 매직링크 단일. 팀 SaaS인데 매 로그인 메일 확인. Google OAuth 옵션 권장. 하단 "약관" 링크는 빈 곳(`login/page.tsx`).

**P2-7. Project Memory가 "연결망"이라며 타임라인** — 인용 수만 표기(`memory/page.tsx`). 비전(그래프) 대비 약함 → 인용 엣지 최소 시각화.

**P2-8. 문서 정합성** — README "52개 모듈" 실제 46개(도구 39 + 문서 7). 사소하나 신뢰도 영향.

---

## 3. 추천 실행 순서 (2주 스프린트 가정)

1. **주차 1 (P0):** 문서 인라인 편집(스키마 이미 있음) → PDF/DOCX export → Deck=PPTX 매핑.
2. **주차 2 (P1):** 모델 자동 폴백 배선 → 문서 생성 `allSettled` → 예산 집계 통일 + 리뷰 예산 가드 → 워크플로우 검증 게이트(또는 미검증 라벨).
3. **틈새 (P2):** 죽은 코드 삭제, 채팅 영속화, RAG 파일 업로드, 온보딩 first-run.

> 근거: 1·2가 "사업계획서를 끝까지 뽑아 제출/수정한다"는 핵심 약속을 완성하고 무료티어 신뢰성을 올린다. 3은 완성도(폴리시)다.
