# 01 · PRD — Product Requirements Document

> 기준일 2026-06-25 · 대상: 1인 개발 / 빠른 MVP · 상위 개념은 [00-README](./00-README.md) 참조

---

## 1. 비전 & 문제 정의

### 1.1 One-liner

> **"창업자가 생각하는 시간을 줄이고 더 좋은 의사결정을 내리게 한다."**

SOS는 아이디어 한 줄에서 시작해, 시장조사·검증·전략분석을 거쳐 투자용 사업계획서까지 **하나의 연결된 워크플로우**로 완성하는 AI 운영체제다. 사용자는 "GPT를 쓴다"가 아니라 **"창업을 진행한다"**고 느낀다.

### 1.2 해결하려는 진짜 문제

창업 초기 팀의 고통은 "글을 못 써서"가 아니다. 진짜 문제는:

1. **맥락 단절** — 아이디어, 시장조사, SWOT, 사업계획서가 각각 다른 문서/툴/대화에 흩어져 있다. 매번 처음부터 설명해야 한다.
2. **반복 입력** — 같은 회사 설명을 ChatGPT, 노션, 사업계획서 양식에 10번씩 다시 쓴다.
3. **프레임워크 진입장벽** — TAM-SAM-SOM, Porter 5 Forces, Lean Canvas를 "제대로" 쓰는 법을 모른다.
4. **결과의 휘발** — 좋은 분석을 한 번 하고 어디 저장했는지 잊는다. 다음 문서에 안 이어진다.
5. **단일 시점 검토** — 내가 쓴 사업계획서가 투자자·심사위원 눈에 어떻게 보일지 모른다.

SOS의 차별점은 **"단절을 없애는 단일 Knowledge Base + 단일 실행 파이프라인"**이다. 경쟁자(범용 챗봇, 노션 템플릿, 사업계획서 자동작성 툴)는 이 루프를 닫지 못한다.

### 1.3 안 하는 것 (Non-goals)

- 범용 AI 챗봇 (대화 자체가 목적이 아니다 — 산출물이 목적)
- 실제 자금 집행/투자 매칭/법인 설립 대행
- 협업 실시간 동시편집(Figma식 멀티커서) — MVP 범위 밖, v2 고려
- 외부 고객 대상 퍼블리싱 플랫폼

---

## 2. 페르소나

| 페르소나 | 상황 | 핵심 니즈 | SOS에서의 주 사용 |
|----------|------|-----------|-------------------|
| **예비창업자 지민** | 아이디어는 있으나 검증·문서화 경험 없음 | "이게 될까?"를 빠르게 확인 | Idea Lab → Validation → One Pager |
| **초기팀 대표 현우** | 정부지원/TIPS 지원 마감 임박 | 양식 맞춘 사업계획서 빠르게 | Documents 원클릭 생성, KB 재사용 |
| **사이드 PM 수아** | 본업 외 사이드 프로젝트 검증 | 짧은 시간에 시장·경쟁 파악 | Research, Analysis 모듈 |
| **액셀러레이터 멤버 (v2)** | 여러 팀 산출물 리뷰 | 팀 템플릿 공유·표준화 | Template Market, Reviewer |

MVP 1차 타겟: **현우**(명확한 마감 + 지불 의사 + 반복 사용). 문서 생성 가치가 가장 즉각적이다.

---

## 3. JTBD (Jobs To Be Done)

- 아이디어가 떠올랐을 때 → **"이게 시장성이 있는지 30분 안에 감 잡고 싶다."**
- 지원사업 마감 3일 전 → **"우리 정보로 양식에 맞는 사업계획서 초안을 오늘 안에 받고 싶다."**
- 투자 미팅 전 → **"투자자가 깔 만한 포인트를 미리 알고 보완하고 싶다."**
- 분석을 한 뒤 → **"이 결과를 다음 문서에 그대로 연결하고 싶다(다시 안 쓰고)."**

---

## 4. 핵심 기능 (전체 범위)

프로젝트 정의서의 5대 기능 + Documents + 고급 기능을 정리. **MVP 포함 여부**를 명시한다(범위는 §6).

### 4.1 Idea Lab — 아이디어 생성
Brainstorm, SCAMPER, Reverse Thinking, Random Combination, Pain Point Discovery, JTBD, Blue Ocean. 전부 Prompt Template 기반 Module.

### 4.2 Research — 시장 조사
TAM-SAM-SOM, 경쟁사 조사, 시장 규모, 트렌드, 산업 분석, 고객 조사, 인터뷰 질문 생성, Reddit 분석, 뉴스 분석. 일부는 **웹 검색 그라운딩** 필요(§7 리스크).

### 4.3 Validation — 검증
Problem Validation, Solution Validation, PMF Score, Lean Canvas, Risk Analysis.

### 4.4 Analysis — 전략 분석
SWOT, PEST(EL), Porter 5 Forces, BCG, Value Chain, Business Model Canvas, Lean Canvas, STP, 3C, 4P, JTBD, Customer Journey, Persona, Blue Ocean, Kano, AARRR, RICE, ICE, MoSCoW. **20+ 프레임워크 = 20+ 템플릿 레코드** (코드 변경 0).

### 4.5 Prompt Library — 프롬프트 관리
고정 프롬프트 + 입력 변수 + 출력 형식. 사용자가 직접 Module 제작/편집/공유. **이것이 플랫폼의 확장 엔진**이다.

### 4.6 Business Documents — 문서 생성
창업패키지 사업계획서, 투자용 Deck, IR Deck, TIPS, 정부지원사업, 해커톤, 공모전, One Page Brief, Executive Summary, Pitch Script, 발표 대본, MVP 기획서, PRD, 서비스 기획서. 각 문서 = `Template + AI + KB`.

### 4.7 고급 기능
Knowledge Graph(프로젝트 메모리), Workflow Builder, AI Reviewer, 버전 관리, Template Market, RAG 근거 표시, 원클릭 문서.

---

## 5. Prompt Builder (가장 중요한 기능)

PRD 관점에서의 요구사항만 정리(설계는 [05](./05-ai-prompt-engine.md)).

```
Prompt = System Prompt + Variables + Instructions + Output Format + Examples
```

**사용자 가치:** 비개발자도 입력 폼만 채우면(시장/타겟/서비스/경쟁사/톤/길이/언어) AI가 일관된 고품질 결과를 낸다. 변수 타입은 input/textarea/select/multi-select/slider/language를 지원한다.

**요구사항(Acceptance):**
- 사용자는 변수 폼을 채워 Module을 실행할 수 있다.
- KB에 이미 있는 값(시장/타겟 등)은 **자동 채움**되어 재입력이 불필요하다.
- 실행 결과는 저장되고, 출처(어떤 KB/자료를 참조했는지)가 표시된다.
- 결과는 다음 Module의 입력으로 한 번에 넘길 수 있다.

---

## 6. MVP 범위 정의 (1인 / 빠름)

원칙: **"핵심 루프 1개를 끝까지 작동시킨 뒤 모듈을 데이터로 늘린다."** 코드 신규 작성을 최소화하고 템플릿 데이터로 기능을 확장하는 구조라, 적은 코드로 넓은 기능을 덮을 수 있다.

### 6.1 MVP에 포함 (Must)

- 인증 + Workspace + Project (단일 멤버부터)
- **Knowledge Base** (구조화 필드 CRUD)
- **Prompt Engine** (변수 폼 → KB 주입 → 멀티 프로바이더 실행 → 스트리밍 → 저장)
- **Module Library 시드**: Analysis 8개(SWOT/PEST/Porter/BMC/Lean Canvas/STP/Persona/AARRR) + Research 3개(TAM-SAM-SOM/경쟁사/고객조사) + Idea 2개(Brainstorm/SCAMPER) + Validation 2개(Problem/PMF Score)
- **Documents 원클릭**: One Page Brief, Executive Summary, 창업패키지 사업계획서(간이) — 3종
- Artifact 저장/조회, 문서 Markdown·PDF Export
- 다크모드 + Command Palette + Auto Save

### 6.2 MVP 직후 (Should, Phase 4-5)

- RAG(근거 기반) + 출처 표시
- Knowledge Graph 시각화
- AI Reviewer (4관점)
- 버전 관리 + diff
- Workflow Builder

### 6.3 MVP 제외 (Won't, 이번엔)

- 실시간 협업 동시편집
- Template Market 공개 마켓(내부 공유는 visibility 플래그로 최소 지원)
- 모바일 네이티브 앱
- Reddit/뉴스 실시간 크롤링 파이프라인 (웹검색 그라운딩으로 대체)

---

## 7. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Research 모듈의 **환각**(없는 시장 수치 생성) | 신뢰도 치명타 | RAG + 웹검색 그라운딩 + "출처 없는 수치는 추정치로 명시" 시스템 프롬프트 규칙 |
| AI 비용 폭증 | 마진 잠식 | 모델 라우팅(요약=Haiku), Workspace 토큰 예산, 캐싱 ([05 §8](./05-ai-prompt-engine.md)) |
| 1인 개발 범위 초과 | 출시 지연 | 컷라인 명시([07](./07-roadmap.md)), 기능=데이터 구조로 코드 최소화 |
| 출력 품질 편차 | 이탈 | Output Schema 강제(`generateObject`) + 프레임워크별 few-shot examples |
| 프롬프트 인젝션(사용자 KB로 시스템 탈취) | 보안 | 사용자 입력은 데이터 경계로 분리, 시스템 프롬프트 우선순위 고정 |

---

## 8. 성공 지표 (North Star & 보조)

- **North Star: 주간 "완성된 Artifact 수 / 활성 프로젝트"** — SOS가 실제로 산출물을 만들어내는가.
- 활성화(Activation): 가입 후 **첫 Artifact 생성까지 시간 < 10분**.
- 핵심 가치 도달: 첫 주 내 **문서 1건 Export** 비율.
- 리텐션: 프로젝트당 **모듈 실행 ≥ 5회/주**.
- 효율: Artifact당 평균 AI 비용, 실패율(파싱/스키마 오류) < 2%.
- 품질: Reviewer 점수 평균, 사용자 "유용함" 피드백(👍/👎) 비율.

---

## 9. 출시 정의 (Definition of Done for MVP)

1. 새 사용자가 가입 → 프로젝트 생성 → KB 입력 → SWOT 실행 → 결과 저장 → 사업계획서 원클릭 생성 → PDF Export를 **막힘 없이** 완료한다.
2. 같은 정보를 두 번 입력하지 않는다(KB 자동 주입 검증).
3. 모든 AI 호출이 서버에서만 일어나고 키가 노출되지 않는다.
4. 모바일 브라우저에서 읽기/실행이 깨지지 않는다(반응형 최소 보장).
5. p95 첫 토큰 도착 < 3초, 평균 Module 완료 < 30초.
