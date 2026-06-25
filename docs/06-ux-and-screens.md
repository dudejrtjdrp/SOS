# 06 · UX & Screens

> UI 철학: **Notion의 단순함 + Linear의 속도 + Figma의 깔끔함 + Perplexity의 AI 경험 + v0의 생성형 UI.** 모든 화면은 `입력 → 분석 → 결과 → 다음 단계`.

---

## 1. 정보 구조 (IA)

```
Workspace
 ├─ Project (선택)
 │   ├─ Knowledge Base       # 단일 진실 / 모든 AI가 참조
 │   ├─ Idea Lab             # 아이디어 생성 모듈
 │   ├─ Research             # 시장 조사 모듈
 │   ├─ Validation           # 검증 모듈
 │   ├─ Analysis             # 전략 분석 모듈(20+)
 │   ├─ Documents            # 문서 생성/편집
 │   ├─ Workflows            # 자동 파이프라인
 │   ├─ Project Memory       # Knowledge Graph 뷰
 │   ├─ AI Chat              # KB 컨텍스트 대화
 │   └─ Settings
 └─ Library                  # Prompt Library / Module 제작·팀 마켓
```

좌측 **사이드바**(프로젝트 전환 + 섹션 네비), 상단 얇은 바(브레드크럼 + `Cmd+K`), 본문은 카드 기반.

---

## 2. 핵심 화면 정의

각 화면을 `목적 / 레이아웃 / 입력→분석→결과→다음 / 상태(빈·로딩·에러)`로 정의.

### 2.1 Project Home (대시보드)
- **목적:** 프로젝트 현황 + 다음 할 일 제안.
- **레이아웃:** KB 완성도 게이지, 최근 Artifact 카드, "추천 다음 단계" 카드(그래프 기반), 빠른 실행(`Cmd+K`).
- **다음 단계:** "KB가 70% 찼어요 — 경쟁사를 채우면 SWOT 품질이 올라갑니다" 식 능동 제안.
- **빈 상태:** "첫 아이디어를 입력해보세요" → Idea Lab CTA.

### 2.2 Knowledge Base
- **목적:** 구조화 필드 + 자유 자료를 한곳에. **반복 입력 제거의 원천.**
- **레이아웃:** 좌측 구조화 필드 폼(서비스/시장/타겟/문제/솔루션/경쟁사/BM/기술스택/수익모델/USP), 우측 자료(노트·업로드·웹클립) 리스트.
- **상호작용:** **Auto Save**(디바운스), 필드별 "AI로 초안 작성" 버튼(해당 필드만 생성), 완성도 게이지.
- **결과/다음:** 채워질수록 모듈 폼이 자동 채움됨을 시각적으로 안내.

### 2.3 Module Runner (가장 자주 쓰는 화면) ★
모든 Idea/Research/Validation/Analysis 모듈이 공유하는 단일 템플릿. **입력→분석→결과→다음의 표준형.**

```
┌───────────────────────── Module Runner ─────────────────────────┐
│  [모듈명]  SWOT 분석            모델: Sonnet ▾   ⏱ 예상 ~20s     │
├──────────────┬──────────────────────────────────────────────────┤
│  ① 입력      │  ③ 결과 (스트리밍)                                │
│  ─ 시장 *    │   ┌ Strengths ┐ ┌ Weaknesses ┐                    │
│   (KB자동채움)│   │ • ...      │ │ • ...       │                   │
│  ─ 경쟁사    │   └────────────┘ └─────────────┘                   │
│  ─ 톤 ▾      │   ┌ Opportunities┐┌ Threats ┐                     │
│  ─ 길이 ▭▭▱  │   └──────────────┘└──────────┘                    │
│  ─ 언어 ▾    │   참고한 자료: [KB·시장] [Artifact·경쟁사조사]     │
│  [실행 ⏎]    │   👍 👎   [KB에 저장] [문서에 추가]               │
│              │  ④ 다음 단계: [Lean Canvas 만들기] [STP] [리뷰받기]│
└──────────────┴──────────────────────────────────────────────────┘
```

- **②분석:** 실행 시 스트리밍, 첫 토큰 빠르게. 취소 가능.
- **출처 칩**(RAG), 피드백(👍/👎), "KB에 저장"/"문서에 추가", **다음 단계 추천**(그래프 기반).
- **에러:** 예산 초과/프로바이더 실패는 회복 안내(모델 변경·재시도).

### 2.4 Documents
- **목적:** 원클릭 생성 + 섹션 편집.
- **레이아웃:** 좌측 섹션 아웃라인(DnD 재정렬), 본문 에디터(섹션별 "재생성"·"AI 보강"), 우측 KB/Artifact 인서트 패널.
- **흐름:** "원클릭 생성"(프리셋 선택: 정부지원/투자/해커톤) → 섹션별 스트리밍 → 편집 → **버전 저장** → Export(MD/PDF/PPTX).
- **다음:** "투자자 관점으로 리뷰받기"(Reviewer) CTA.

### 2.5 Workflows
- **목적:** 파이프라인 실행/구성.
- **MVP:** 프리셋 카드("지원사업 패키지: 아이디어→시장조사→SWOT→사업계획서") → 실행 → 노드별 진행 표시(Realtime).
- **Phase 5:** react-flow 캔버스로 DnD 빌더.

### 2.6 Project Memory (Knowledge Graph)
- 산출물 연결망 시각화(노드=Artifact/Doc, 엣지=derived_from/cites). 노드 클릭 → 원본. KB 변경 영향 추적.
- **MVP:** 타임라인/리스트형. 그래프 뷰는 Phase 4.

### 2.7 Library (Prompt / Module)
- **목적:** Module 제작·편집·팀 공유(마켓).
- **레이아웃:** Module 리스트(시스템/내/팀), 우측 **Prompt Builder 폼**(System Prompt·Variables·Instructions·Output Format·Examples) + **라이브 프리뷰**(샘플 입력으로 실행).
- **버전:** 저장 시 새 버전, diff 보기, 이전 버전 복원.

### 2.8 AI Chat
- KB·선택 Artifact를 컨텍스트로 한 대화. 답변에서 바로 "Artifact로 저장" / "문서에 추가". 일반 챗봇이 아니라 **프로젝트 맥락 대화**.

---

## 3. AI Everywhere — 진입점 패턴

| 패턴 | 동작 |
|------|------|
| **Command Palette (`Cmd/Ctrl+K`)** | 어디서나 모듈 실행·이동·문서 생성·검색. cmdk 기반 |
| **Slash Command (`/`)** | 에디터/입력창에서 `/swot`, `/리뷰`, `/요약` 등 인라인 실행 |
| **"AI에게 맡기기" 버튼** | 모든 빈 필드·섹션에 인라인 생성 버튼(v0식 생성형 시작) |
| **다음 단계 추천** | 결과마다 그래프 기반 후속 모듈 제안 |

---

## 4. 디자인 시스템

### 4.1 토큰 (다크모드 기본)

```css
:root[data-theme="dark"] {
  --bg: #0B0C0E;        --surface: #141518;   --surface-2: #1C1E22;
  --border: #2A2D33;    --text: #ECEDEE;      --text-muted: #9BA1A8;
  --primary: #6E56CF;   --primary-fg: #FFFFFF;            /* 보라 액센트 */
  --success: #30A46C;   --warning: #F5A623;   --danger: #E5484D;
  --radius: 12px;       --radius-sm: 8px;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.24);
}
/* 라이트 모드는 동일 토큰의 라이트 매핑 */
```

- **타이포:** Pretendard(한글) + Inter(영문/숫자). 본문 14–15px, 라인하이트 1.6.
- **간격:** 4px 그리드. 카드 패딩 16–24px.
- **Glass Morphism 최소화:** 떠 있는 패널(Command Palette, 토스트)에만 절제 사용.
- **모션:** 빠르고 미세하게(120–180ms). 스트리밍 텍스트 페이드인.

### 4.2 컴포넌트 (shadcn/ui 기반)
Button, Card, Input/Textarea, Select, MultiSelect, Slider, Dialog, Sheet, Command(cmdk), Tabs, Toast(sonner), Skeleton, Badge/Chip(출처), Tooltip, DropdownMenu, ResizablePanel, Avatar, Progress(완성도/스트리밍).

도메인 컴포넌트: `ModuleRunner`, `VariableForm`(변수 스키마→폼 자동 생성), `ResultRenderer`(output_format별 렌더: SWOT 4분면·캔버스·리스트), `SourceChips`, `NextStepBar`, `KBField`, `PromptBuilder`, `VersionDiff`, `ReviewRadar`.

> **VariableForm이 핵심:** `prompt_version.variables`(jsonb)를 받아 타입별 위젯을 자동 렌더 → 새 모듈 추가 시 UI 코드 0.

---

## 5. 인터랙션 원칙 (Fast · Keyboard First)

- **Auto Save** 전역(디바운스 + Optimistic UI + 충돌 시 마지막 우선). "저장" 버튼 없음.
- **Keyboard First:** `Cmd+K`(팔레트), `Cmd+Enter`(실행), `Esc`(취소), `J/K`(리스트 이동), `/`(슬래시).
- **Drag & Drop:** 문서 섹션 재정렬, 워크플로우 노드, KB 자료 정렬(dnd-kit).
- **스트리밍 우선:** 모든 생성은 즉시 부분 결과. 스켈레톤 → 토큰 스트림.
- **빈 상태는 항상 행동 제안.** 막다른 화면 금지.
- **반응형:** 데스크톱 3컬럼 → 태블릿 2 → 모바일 1(읽기·실행 보장, 빌더류는 데스크톱 우선).

---

## 6. 접근성
대비 WCAG AA, 포커스 링 항상 표시, 키보드 전 기능 도달, 스트리밍 영역 `aria-live`, 모달 포커스 트랩, 모션 축소 설정 존중(`prefers-reduced-motion`).

---

## 7. 화면 → 데이터/엔드포인트 매핑

| 화면 | 읽기(RSC) | 쓰기 |
|------|-----------|------|
| Project Home | projects/artifacts/graph | — |
| Knowledge Base | knowledge_bases/entries | `updateKnowledgeFields`, `addKnowledgeEntry` |
| Module Runner | modules/prompt_versions | `POST /api/runs` |
| Documents | documents/versions | `POST /api/documents/generate`, `saveDocumentVersion` |
| Workflows | workflows/workflow_runs | `POST /api/workflows/:id/run` |
| Library | modules/prompt_versions | `savePromptVersion`, `setCurrentPromptVersion` |
| Reviewer 패널 | reviews | `POST /api/reviews` |
