import Link from "next/link";
import { DatabaseIcon } from "lucide-react";
import { getModuleIdsByKeys, getKBFields } from "@/lib/queries";
import { kbCompleteness } from "@/core/schemas/kb";
import { WorkflowRunner, type Preset } from "@/components/app/workflow-runner";

export const metadata = { title: "Workflows" };

/** Short chip labels for module keys (keeps preset definitions terse + typo-safe). */
const L: Record<string, string> = {
  pain_point: "고통점",
  brainstorm: "아이디어 발산",
  scamper: "SCAMPER",
  reverse_thinking: "역발상",
  random_combination: "강제결합",
  ice: "ICE 랭킹",
  customer_research: "고객 조사",
  interview_questions: "인터뷰 질문",
  problem_validation: "문제 검증",
  solution_validation: "솔루션 검증",
  lean_canvas: "린 캔버스",
  pmf_score: "PMF 점수",
  pestel: "PESTEL",
  porter_five: "5 Forces",
  three_c: "3C",
  value_chain: "밸류체인",
  swot: "SWOT",
  blue_ocean: "블루오션",
  jtbd: "JTBD",
  persona: "페르소나",
  customer_journey: "고객여정",
  kano: "Kano",
  rice: "RICE",
  stp: "STP",
  four_p: "4P",
  aarrr: "AARRR",
  tam_sam_som: "시장규모",
  competitor_scan: "경쟁사",
  business_model_canvas: "BMC",
  industry_analysis: "산업분석",
  risk_analysis: "리스크",
};
const steps = (...keys: string[]) => keys.map((key) => ({ key, label: L[key] ?? key }));

/**
 * Workflow presets — research-backed pipelines (Lean Startup / Customer
 * Development, design-thinking discovery, PSST·TIPS grant prep, IR readiness).
 * Step counts vary intentionally by methodology; exploratory pipelines end in
 * analysis (no `doc`) while convergent ones terminate in a document.
 */
const PRESETS: Preset[] = [
  // ── 탐색 (divergent / discovery) ──────────────────────────────
  {
    id: "idea_sprint",
    name: "아이디어 발굴 스프린트",
    desc: "도메인은 있는데 아이디어가 없을 때. 발산한 뒤 ICE로 후보를 추립니다.",
    phase: "탐색",
    steps: steps("pain_point", "brainstorm", "scamper", "reverse_thinking", "random_combination", "ice"),
  },
  {
    id: "problem_discovery",
    name: "문제 발견 & 검증",
    desc: "만들기 전에 — 고객 인터뷰로 문제가 진짜인지 확인하는 게이트.",
    phase: "탐색",
    steps: steps("pain_point", "customer_research", "interview_questions", "problem_validation"),
  },

  // ── 검증 (validation) ─────────────────────────────────────────
  {
    id: "lean_mvp",
    name: "린 검증 → MVP 기획",
    desc: "문제·솔루션을 차례로 검증하고 MVP 기획서까지. Lean Startup 정석 흐름.",
    phase: "검증",
    steps: steps("pain_point", "customer_research", "problem_validation", "solution_validation", "lean_canvas", "pmf_score"),
    doc: "mvp_plan",
    docLabel: "MVP 기획서",
  },
  {
    id: "quick_validate",
    name: "빠른 검증 → One Pager",
    desc: "핵심만 빠르게 검증하고 한 장 브리프로 정리합니다.",
    phase: "검증",
    steps: steps("problem_validation", "pmf_score", "lean_canvas"),
    doc: "one_pager",
    docLabel: "One Pager",
  },

  // ── 전략 (strategy) ───────────────────────────────────────────
  {
    id: "market_strategy",
    name: "심층 시장·전략 분석",
    desc: "거시→산업→경쟁→내부→종합. SWOT은 마지막에 합성합니다.",
    phase: "전략",
    steps: steps("pestel", "porter_five", "three_c", "value_chain", "swot", "blue_ocean"),
  },

  // ── 제품·서비스 (product discovery) ───────────────────────────
  {
    id: "product_prd",
    name: "제품 디스커버리 → PRD",
    desc: "JTBD→페르소나→여정→우선순위. 근거 있는 PRD를 만듭니다.",
    phase: "제품·서비스",
    steps: steps("customer_research", "jtbd", "persona", "customer_journey", "kano", "rice"),
    doc: "prd",
    docLabel: "PRD",
  },
  {
    id: "service_plan",
    name: "서비스 기획서",
    desc: "고객 조사부터 여정까지 — 서비스 블루프린트로 정리합니다.",
    phase: "제품·서비스",
    steps: steps("customer_research", "jtbd", "persona", "customer_journey"),
    doc: "service_plan",
    docLabel: "서비스 기획서",
  },

  // ── GTM (go-to-market) ────────────────────────────────────────
  {
    id: "gtm",
    name: "GTM 플랜",
    desc: "STP→페르소나→여정→4P→AARRR. 출시·성장 운영 계획.",
    phase: "GTM",
    steps: steps("stp", "persona", "customer_journey", "four_p", "aarrr"),
  },

  // ── 지원사업 (government grants) ──────────────────────────────
  {
    id: "gov_package",
    name: "예비창업패키지 사업계획서",
    desc: "PSST 구조에 맞춰 문제·시장·모델을 준비해 사업계획서를 완성합니다.",
    phase: "지원사업",
    steps: steps("problem_validation", "persona", "customer_research", "tam_sam_som", "competitor_scan", "business_model_canvas", "stp"),
    doc: "biz_plan",
    docLabel: "사업계획서",
  },
  {
    id: "tips",
    name: "TIPS 사업계획서",
    desc: "기술성 중심. 산업·시장·모델·리스크를 거쳐 TIPS 양식으로.",
    phase: "지원사업",
    steps: steps("problem_validation", "industry_analysis", "tam_sam_som", "competitor_scan", "business_model_canvas", "risk_analysis"),
    doc: "tips",
    docLabel: "TIPS 계획서",
  },

  // ── 투자 유치 (investment) ────────────────────────────────────
  {
    id: "ir",
    name: "IR Deck",
    desc: "시장→경쟁→모델→GTM→지표→리스크. 투자자용 IR 자료.",
    phase: "투자 유치",
    steps: steps("tam_sam_som", "competitor_scan", "business_model_canvas", "stp", "aarrr", "risk_analysis"),
    doc: "ir_deck",
    docLabel: "IR Deck",
  },
  {
    id: "pitch",
    name: "피치 스크립트",
    desc: "분석이 끝났을 때 — 핵심 증거로 60초 피치 대본을 뽑습니다.",
    phase: "투자 유치",
    steps: steps("pmf_score", "competitor_scan"),
    doc: "pitch_script",
    docLabel: "피치 대본",
  },
];

export default async function WorkflowsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const keys = [...new Set(PRESETS.flatMap((p) => p.steps.map((s) => s.key)))];
  const [idMap, fields] = await Promise.all([
    getModuleIdsByKeys(keys),
    getKBFields(project),
  ]);
  const completeness = kbCompleteness(fields);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          여러 단계를 한 번에 실행하는 자동 파이프라인. 각 단계의 결과가 다음 단계와
          마지막 문서까지 근거로 이어집니다.
        </p>
      </header>

      {/* Workflows run every step with no input — purely from the Knowledge Base */}
      <Link
        href={`/p/${project}/knowledge`}
        className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
      >
        <DatabaseIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Knowledge Base 완성도</span>
            <span className="text-muted-foreground">{completeness}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${completeness}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {completeness >= 80
              ? "준비됐어요. 워크플로우는 Knowledge Base만으로 모든 단계를 실행합니다."
              : "워크플로우는 입력 없이 Knowledge Base만으로 실행돼요. 비어 있으면 결과가 부실해지니 먼저 채우는 걸 권장합니다 →"}
          </p>
        </div>
      </Link>

      <WorkflowRunner projectId={project} presets={PRESETS} idMap={idMap} />
    </div>
  );
}
