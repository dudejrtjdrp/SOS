# 08 · Human-in-the-Loop — AI·인간 역할 경계

> SOS의 7번째 설계 원칙 **"Human Decides"**의 구현 명세. AI는 *생각하는 시간을 줄이고*(발산·구조화·초안), 사람은 *책임이 따르는 결정을 한다*(검증·선택·확신). 이 문서는 그 경계를 **상태(state) · 게이트(gate) · UI**로 못 박는다.
>
> 관련: [00 §2 화면 흐름 불변식](./00-README.md) · [00 §5 설계 원칙](./00-README.md) · [05 §3.3 인젝션 방어·환각 규칙](./05-ai-prompt-engine.md) · [05 §7 AI Reviewer](./05-ai-prompt-engine.md) · [03 §3.4 artifacts](./03-database-schema.md)

---

## 1. 문제 — "전적으로 AI에 위임"의 함정

현재 파이프라인(05 §1)은 7단계가 끝나면 Artifact가 생기고, UI(`module-runner.tsx`)는 곧바로 "다음 단계: 문서 생성 →"을 **링크**한다. 즉 사람의 결정이 흐름에 들어갈 **구조적 자리가 없다.** 결과적으로:

- AI가 만든 시장 수치(TAM 등)가 검증 없이 KB '진실'로 굳어 다음 산출물로 전파된다 — **환각의 복리.**
- 고객 검증(Validation)을 실제 접촉 없이 AI 추론으로 대체한다 — 창업의 핵심을 건너뛴다.
- 피치의 확신·서사가 사람 손을 거치지 않아 "AI가 쓴 티"가 난다. 투자자는 AI 분석이 아니라 창업자의 통찰에 투자한다.

이미 프롬프트 규칙(05 §3.3, §9)은 "근거 없는 수치는 '추정/확인 필요'로 표기"하라고 지시한다. 하지만 그건 **프롬프트 힌트일 뿐 상태가 아니다** — 화면에 표시돼도 아무것도 막지 않는다. 본 설계는 그 힌트를 **막을 수 있는 상태와 게이트**로 승격한다.

---

## 2. 원칙 — Human Decides

```
AI 영역    발산 · 구조화 · 초안 · 리서치 수집      ("생각하는 시간을 줄인다")
인간 영역  검증 · 결정 · 확신 · 고객 접촉           ("책임이 따르는 일")

경계       모든 Run은 '결과'까지만 자동이다.
           KB 승격 · 문서 확정 · 다음 노드 진행은
           사람의 명시적 결정(Decision Gate)을 통과해야 한다.
```

화면 흐름 불변식(00 §2)을 한 단계 정밀화한다. "다음 단계"는 자동 링크가 아니라 **사람이 통과시키는 게이트**다.

```
입력 → 분석 → 결과 → [ 사람의 결정 · Decision Gate ] → 다음 단계
        AI            AI            사람                    AI(준비) · 사람(확정)
```

이 원칙은 6대 원칙과 충돌하지 않고 **Minimal·AI Native를 보강**한다: 한 화면 = 한 가지 의사결정(00 §5)에서, 그 "의사결정"의 주체가 사람임을 명확히 한다.

---

## 3. 모듈별 경계 맵

`modules.category`(0004) 기준으로 게이트 강도를 다르게 둔다.

| category | AI가 주도 | 사람이 책임(필수) | 생성 시 기본 상태 |
|----------|-----------|-------------------|-------------------|
| `idea` | 발산(brainstorm/SCAMPER), 조합 | 어떤 아이디어를 추진할지 **선택** | `ai_draft` |
| `research` | 자료 수집, 구조화, 초안 | 시장 규모·경쟁사 **수치·출처 검증** | **`needs_review`** |
| `validation` | 인터뷰 질문·가설 설계 | 실제 **고객 접촉**(Reality Task)과 판정 | **`needs_review`** |
| `analysis` | 프레임워크 채움(SWOT/Porter…) | 결과 **해석**과 전략 **선택** | `ai_draft` |
| `document` | 섹션 초안 합성 | **서사·숫자 책임**과 최종 확정 | **`needs_review`** |

> 핵심: `research` · `validation` · `document`는 기본 `needs_review`로 태어난다 — 사람이 통과시키기 전엔 KB·문서로 못 나간다. `idea` · `analysis`는 `ai_draft`(가벼운 확인 후 진행). 이 기본값은 시드 모듈 정의(`core/modules/seed/*`)에 `default_verification` 한 줄로 선언한다.

---

## 4. 4대 장치

### 4.1 Decision Gate — 의사결정 게이트

Run은 결과(7단계)까지만 자동이다. 그 뒤 세 가지 "넘어가는 행위"는 모두 사람의 상태 전이를 요구한다.

| 넘어가는 행위 | 게이트 조건 |
|---------------|-------------|
| KB에 저장(`saveArtifactToKnowledge`) | `verification_status = 'human_verified'` |
| 문서 섹션으로 확정(`document_versions`) | 소스 Artifact가 `human_verified` |
| Workflow 다음 노드 commit | 노드의 `gate: 'manual'`이면 사람 확인 후 진행 |

전이 동작: `ai_draft / needs_review → human_verified | rejected`. UI는 "다음 단계" 링크를 **게이트 통과 후에만** 활성화한다(§8). Workflow(05 §6)는 노드별로 `gate: 'auto' | 'manual'`을 두어, 사실 검증이 필요한 노드(research/document)는 `manual` 기본.

### 4.2 Founder's Take — 창업자의 판단

모든 Artifact 하단에 "내 판단" 한 줄 입력칸(`artifacts.founder_take`). 결과에 대한 사람의 해석·확신·보류를 남긴다. KB로 승격될 때 **함께 흘러** 이후 Run의 컨텍스트가 된다 → KB의 주인이 AI가 아니라 사람이 된다.

> 안티패턴: AI가 `founder_take`를 대신 채우지 않는다. 빈칸을 사람이 채우는 것 자체가 장치의 핵심이다. AI는 "생각할 질문"(예: "이 SO 전략, 6개월 안에 실행 가능한가?")만 옆에 제시할 수 있다.

### 4.3 Verification Status — 검증 상태

사실의 신뢰도를 **두 층위**로 관리한다.

- **Claim 층위(세밀):** Research류 출력의 각 수치를 claim 객체로 태깅(§6). `confidence: 'estimate'`거나 `verified: false`면 "확인 필요" 배지.
- **Artifact 층위(전체):** `artifacts.verification_status`. 미해결 `estimate`(=`verified:false`)가 하나라도 있으면 `human_verified`로 전이 불가(앱 레벨 소프트 가드).

`reviews`(AI Reviewer, 05 §7)가 약점을 지적하면 해당 Artifact를 `needs_review`로 내릴 수 있다 — AI 평가가 사람 검토를 **유발**하되 **대체하지 않는다.**

### 4.4 Reality Task — 실측 과제

Validation은 AI가 체크할 수 없는 **실제 행동**을 사람에게 과제로 발급한다(예: "타겟 고객 5명 인터뷰", "랜딩 테스트로 전환율 측정"). AI의 역할은 인터뷰 질문·스크립트·가설까지. **결과 입력은 사람만** 가능하며, 입력된 실측은 `knowledge_entries`(`source_type='note'`)로 들어가 근거가 된다.

> MVP: Validation 모듈 output_format에 `next_actions[]`(체크리스트)를 포함하고, 사람이 결과를 KB에 적는다. 전용 `validation_tasks` 테이블은 후속 Phase 옵션.

---

## 5. 스키마 델타 (마이그레이션 0008)

기존 컨벤션(03 §2: `text + check`, RLS 상속) 준수. **추가형(additive)** — 기존 행은 기본값으로 채워지며 데이터 마이그레이션 불필요. 전문은 `supabase/migrations/0008_human_in_the_loop.sql`.

```sql
-- artifacts: 사람의 결정 상태
alter table public.artifacts
  add column if not exists verification_status text not null default 'ai_draft'
    check (verification_status in ('ai_draft','needs_review','human_verified','rejected')),
  add column if not exists founder_take text,
  add column if not exists verified_by  uuid references auth.users(id),
  add column if not exists verified_at  timestamptz;

-- 사람의 검토 대기열(프로젝트별)
create index if not exists idx_artifacts_needs_review
  on public.artifacts(project_id, created_at desc)
  where verification_status = 'needs_review';

-- knowledge_entries: 승격 시 신뢰도 + 출처 보존
alter table public.knowledge_entries
  add column if not exists verification_status text not null default 'human_verified'
    check (verification_status in ('ai_draft','needs_review','human_verified','rejected')),
  add column if not exists source_artifact_id uuid references public.artifacts(id) on delete set null;
```

설계 메모:

- `feedback`(👍/👎) · `pinned`는 그대로 둔다 — 역할이 다르다(§9).
- 수기 노트는 사람이 썼으므로 `knowledge_entries.verification_status` 기본 `human_verified`. Artifact에서 승격하면 앱이 Artifact의 상태·id를 복사한다.
- RLS 변경 없음: 새 컬럼은 기존 `artifacts` / `knowledge_entries` 정책(0007)을 그대로 상속한다. 새 테이블이 없으므로 정책 추가 불필요.

---

## 6. Output Format 규약 — claim 태깅

05 §3.3의 "추정/확인 필요" 프롬프트 규칙을 **구조화**한다. Research류에서 사실·수치는 문자열이 아니라 claim 객체로 출력한다.

```jsonc
// 예: tam_sam_som 모듈 output_format 일부
{
  "tam": {
    "value":      "약 1.2조 원",
    "confidence": "estimate",                 // 'fact' | 'estimate'
    "source":     "공개 출처 없음 — 확인 필요",  // fact면 출처 URL/문헌
    "verified":   false                        // 사람이 검증하면 true
  }
}
```

- **엔진:** `output-format.ts`에 `"claim"` / `"claim[]"` 슈가 타입을 추가(없으면 기존 `object`/`object[]`로 동일 형태 선언). `buildOutputZod`가 `{ value:string, confidence:'fact'|'estimate', source?:string, verified:boolean }`로 강제.
- **렌더:** `structured-result.tsx`가 `confidence==='estimate'` 또는 `verified===false`를 **"확인 필요" 배지**로 표시하고, 클릭 시 사람이 `verified:true`로 전환.
- **게이트 연동:** 미해결 estimate가 남아 있으면 Artifact는 `human_verified`로 못 간다(§4.3).

---

## 7. 파이프라인 통합 — 8번째 단계

05 §1의 7단계 뒤에 **사람 게이트**를 명시적 단계로 추가한다.

```
7. Parse & Persist  →  Artifact 저장 (verification_status = ai_draft | needs_review)
8. Human Gate       →  사람이 검토 → human_verified | rejected (+ founder_take 입력)
                       이 전이 전에는 KB 승격 · 문서 확정 · 다음 노드 commit 불가
```

서버 흐름: 신규 액션 `verifyArtifact({ artifactId, status, founderTake })`가 상태·`verified_by`·`verified_at`를 기록한다. 기존 `saveArtifactToKnowledge`는 `human_verified`가 아니면 거부(앱 사전 체크). 승격 시 `founder_take`·`verification_status`·`source_artifact_id`를 `knowledge_entries`로 복사하고, `graph_edges`에 `derived_from` 엣지를 남긴다(05 §5).

---

## 8. UI (06 연계)

`ModuleRunner` done 상태의 버튼 행을 게이트로 개편한다.

- **결과 카드 하단:** "내 판단" Textarea(`founder_take`) + 게이트 버튼 **[검증 완료] · [수정 필요] · [반려]**.
- **잠금:** `KB에 저장` · `다음 단계: 문서 생성 →`은 `human_verified` 전까지 **비활성**(툴팁: "먼저 검증을 완료하세요").
- **배지:** estimate/미검증 claim에 "확인 필요" 배지(§6). 상단에 현재 `verification_status` 칩.
- **검토 대기열:** 프로젝트 사이드바에 `needs_review` Artifact 목록(인덱스 `idx_artifacts_needs_review` 활용) — 사람이 무엇을 통과시켜야 하는지 한눈에.

> 디자인 원칙(Beautiful·Minimal): 게이트는 마찰이 아니라 **신뢰의 표식**이어야 한다. 검증된 산출물엔 차분한 체크 마크, 미검증엔 절제된 경고색 한 톤.

---

## 9. 기존 개념과의 관계 (혼동 금지)

| 개념 | 의미 | 주체 |
|------|------|------|
| `feedback`(👍/👎) | 품질 신호(향후 개선·랭킹용) | 사람, 가벼움 |
| **`verification_status`** | **신뢰 게이트**(KB/문서 진입 허가) | **사람, 구속력 있음** |
| `pinned` | 컨텍스트 우선순위 가중 | 사람 |
| `reviews`(AI Reviewer) | 투자자/심사위원 등 **AI** 다관점 평가 | **AI** — 사람 검증을 대체하지 않음 |

`reviews`는 이름이 "review"여도 **AI 영역**이다. 사람의 검증은 오직 `verification_status` 전이로만 일어난다.

---

## 10. 구현 체크리스트

- [ ] `supabase/migrations/0008_human_in_the_loop.sql` 적용(§5).
- [ ] `src/types/db.ts` — `VerificationStatus = 'ai_draft'|'needs_review'|'human_verified'|'rejected'` 추가.
- [ ] `src/core/schemas/output-format.ts` — `claim`/`claim[]` 슈가 타입(§6).
- [ ] `src/components/app/structured-result.tsx` — claim 배지·"확인 필요" 렌더.
- [ ] `src/components/app/module-runner.tsx` — Founder's Take 입력 + 게이트 버튼 + 잠금.
- [ ] `src/server/actions/artifact.ts` — `verifyArtifact` 추가, `saveArtifactToKnowledge`에 게이트 가드, 승격 시 필드 복사.
- [ ] `src/core/modules/seed/*` — research/validation/document에 `default_verification='needs_review'`, Research 출력 수치를 claim으로.
- [ ] (선택) `reviews` 약점 발견 시 대상 Artifact를 `needs_review`로 강등.

---

## 11. 안티패턴

- **전체 자동 승인 버튼 금지.** "모두 검증 완료" 한 방 버튼은 게이트의 의미를 없앤다.
- **AI가 `founder_take`를 대필 금지.** 빈칸은 사람 몫. AI는 질문만 제시.
- **`needs_review` 사실을 확정 사실로 인용 금지.** RAG 컨텍스트(05 §4)로 들어가도 "추정"으로 표기를 유지하고, 검증 전엔 문서 본문에 단정적으로 쓰지 않는다.
