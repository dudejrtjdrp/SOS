/**
 * Manual (AI-free) input schemas for visualization-capable tools. Each schema's
 * field keys mirror exactly what the matching `build()` in ./registry consumes,
 * so the structured data a user types renders straight into the UI template:
 *
 *   사용자 입력 → 데이터 구조 → 미리 만든 UI Template → 자동 렌더링
 *
 * Keep these in sync with MODULE_VIZ in ./registry.
 */

export type VizSubField =
  | { kind: "text"; key: string; label: string; placeholder?: string }
  | { kind: "list"; key: string; label: string; placeholder?: string }
  | { kind: "select"; key: string; label: string; options: string[] };

export type VizField =
  | { kind: "list"; key: string; label: string; placeholder?: string }
  | { kind: "text"; key: string; label: string; placeholder?: string; multiline?: boolean }
  | { kind: "group"; key: string; label: string; fields: VizSubField[] }
  | { kind: "objectList"; key: string; label: string; itemLabel: string; fields: VizSubField[] };

export interface VizInputSchema {
  /** One-line guidance shown above the form. */
  hint?: string;
  fields: VizField[];
}

const BCG_CATEGORIES = ["Star", "Question Mark", "Cash Cow", "Dog"];

/** {level, rationale} — one Porter force. */
function forceFields(): VizSubField[] {
  return [
    { kind: "text", key: "level", label: "수준", placeholder: "높음 / 보통 / 낮음" },
    { kind: "text", key: "rationale", label: "근거" },
  ];
}

/** {metric, tactics[]} — one AARRR stage. */
function stageFields(): VizSubField[] {
  return [
    { kind: "text", key: "metric", label: "핵심 지표", placeholder: "예: 가입 전환율 12%" },
    { kind: "list", key: "tactics", label: "전술" },
  ];
}

export const VIZ_INPUT: Record<string, VizInputSchema> = {
  swot: {
    hint: "각 칸에 한 줄에 하나씩 입력하면 2×2 매트릭스로 그려집니다.",
    fields: [
      { kind: "list", key: "strengths", label: "강점 (S)", placeholder: "예: AI 자동화" },
      { kind: "list", key: "weaknesses", label: "약점 (W)", placeholder: "예: 초기 유저 부족" },
      { kind: "list", key: "opportunities", label: "기회 (O)", placeholder: "예: AI 시장 성장" },
      { kind: "list", key: "threats", label: "위협 (T)", placeholder: "예: 경쟁사 증가" },
    ],
  },

  three_c: {
    fields: [
      { kind: "list", key: "company", label: "자사 (Company)" },
      { kind: "list", key: "customer", label: "고객 (Customer)" },
      { kind: "list", key: "competitor", label: "경쟁사 (Competitor)" },
      { kind: "text", key: "implication", label: "전략적 시사점", multiline: true },
    ],
  },

  stp: {
    hint: "세그먼트를 추가하면 포지셔닝 맵에 점으로 표시됩니다.",
    fields: [
      {
        kind: "objectList",
        key: "segmentation",
        label: "세분화 (Segmentation)",
        itemLabel: "세그먼트",
        fields: [
          { kind: "text", key: "name", label: "이름", placeholder: "예: 대학생" },
          { kind: "text", key: "description", label: "설명" },
        ],
      },
      { kind: "text", key: "targeting", label: "타겟팅 (Targeting)", multiline: true },
      { kind: "text", key: "positioning", label: "포지셔닝 (Positioning)", multiline: true },
    ],
  },

  bcg_matrix: {
    hint: "각 제품의 분류를 고르면 BCG 매트릭스의 해당 사분면에 배치됩니다.",
    fields: [
      {
        kind: "objectList",
        key: "products",
        label: "제품 / 사업",
        itemLabel: "제품",
        fields: [
          { kind: "text", key: "name", label: "이름" },
          { kind: "select", key: "category", label: "분류", options: BCG_CATEGORIES },
        ],
      },
    ],
  },

  porter_five: {
    hint: "각 force의 수준과 근거를 입력하세요. 가운데가 기존 경쟁 강도입니다.",
    fields: [
      { kind: "group", key: "rivalry", label: "기존 경쟁 강도", fields: forceFields() },
      { kind: "group", key: "new_entrants", label: "신규 진입 위협", fields: forceFields() },
      { kind: "group", key: "suppliers", label: "공급자 교섭력", fields: forceFields() },
      { kind: "group", key: "buyers", label: "구매자 교섭력", fields: forceFields() },
      { kind: "group", key: "substitutes", label: "대체재 위협", fields: forceFields() },
      { kind: "text", key: "attractiveness", label: "산업 매력도 종합", multiline: true },
    ],
  },

  business_model_canvas: {
    hint: "9개 블록을 채우면 비즈니스 모델 캔버스로 배치됩니다.",
    fields: [
      { kind: "list", key: "key_partners", label: "핵심 파트너" },
      { kind: "list", key: "key_activities", label: "핵심 활동" },
      { kind: "list", key: "key_resources", label: "핵심 자원" },
      { kind: "list", key: "value_propositions", label: "가치 제안" },
      { kind: "list", key: "customer_relationships", label: "고객 관계" },
      { kind: "list", key: "channels", label: "채널" },
      { kind: "list", key: "customer_segments", label: "고객 세그먼트" },
      { kind: "list", key: "cost_structure", label: "비용 구조" },
      { kind: "list", key: "revenue_streams", label: "수익원" },
    ],
  },

  lean_canvas: {
    hint: "9개 블록을 채우면 린 캔버스로 배치됩니다.",
    fields: [
      { kind: "list", key: "problem", label: "문제" },
      { kind: "list", key: "solution", label: "솔루션" },
      { kind: "list", key: "key_metrics", label: "핵심 지표" },
      { kind: "list", key: "unique_value_proposition", label: "고유 가치 제안" },
      { kind: "list", key: "unfair_advantage", label: "불공정 우위" },
      { kind: "list", key: "channels", label: "채널" },
      { kind: "list", key: "customer_segments", label: "고객 세그먼트" },
      { kind: "list", key: "cost_structure", label: "비용 구조" },
      { kind: "list", key: "revenue_streams", label: "수익원" },
    ],
  },

  aarrr: {
    hint: "각 단계의 지표와 전술을 입력하면 퍼널로 그려집니다.",
    fields: [
      { kind: "group", key: "acquisition", label: "획득 (Acquisition)", fields: stageFields() },
      { kind: "group", key: "activation", label: "활성화 (Activation)", fields: stageFields() },
      { kind: "group", key: "retention", label: "유지 (Retention)", fields: stageFields() },
      { kind: "group", key: "revenue", label: "수익 (Revenue)", fields: stageFields() },
      { kind: "group", key: "referral", label: "추천 (Referral)", fields: stageFields() },
    ],
  },

  seven_s: {
    hint: "공유 가치가 중심에, 나머지 6개가 둘레에 배치됩니다.",
    fields: [
      { kind: "text", key: "shared_values", label: "공유 가치 (Shared Values)", multiline: true },
      { kind: "text", key: "strategy", label: "전략 (Strategy)", multiline: true },
      { kind: "text", key: "structure", label: "구조 (Structure)", multiline: true },
      { kind: "text", key: "systems", label: "시스템 (Systems)", multiline: true },
      { kind: "text", key: "style", label: "스타일 (Style)", multiline: true },
      { kind: "text", key: "staff", label: "구성원 (Staff)", multiline: true },
      { kind: "text", key: "skills", label: "역량 (Skills)", multiline: true },
      { kind: "text", key: "alignment", label: "정합성 진단", multiline: true },
    ],
  },
};

/** Manual-input schema for a module key, or null if it has no visualization. */
export function getVizInput(key: string | null | undefined): VizInputSchema | null {
  return (key && VIZ_INPUT[key]) || null;
}

// ── External-prompt output spec ───────────────────────────────────
// Generate the JSON shape + field guide to embed in the copied prompt, so an
// external AI returns data in exactly the structure each visualization consumes.
// Pasting that JSON back then renders straight into the diagram.

function subSkeleton(sf: VizSubField): unknown {
  if (sf.kind === "list") return ["...", "..."];
  if (sf.kind === "select") return sf.options.join(" | ");
  return "...";
}

function fieldSkeleton(f: VizField): unknown {
  switch (f.kind) {
    case "list":
      return ["...", "..."];
    case "text":
      return "...";
    case "group": {
      const g: Record<string, unknown> = {};
      for (const sf of f.fields) g[sf.key] = subSkeleton(sf);
      return g;
    }
    case "objectList": {
      const item: Record<string, unknown> = {};
      for (const sf of f.fields) item[sf.key] = subSkeleton(sf);
      return [item];
    }
  }
}

function fieldGuideLine(f: VizField): string {
  switch (f.kind) {
    case "list":
      return `- ${f.key}: ${f.label} (문자열 목록)`;
    case "text":
      return `- ${f.key}: ${f.label} (문자열)`;
    case "group":
      return `- ${f.key}: ${f.label} (객체 — ${f.fields.map((s) => s.key).join(", ")})`;
    case "objectList":
      return `- ${f.key}: ${f.label} (객체 목록 — 각 항목: ${f.fields.map((s) => s.key).join(", ")})`;
  }
}

/**
 * Strict JSON output spec for a viz tool, to append under the prompt's [출력 형식].
 * Returns null for non-viz tools (keep the default markdown/structured spec).
 */
export function buildVizPromptSpec(key: string | null | undefined): string | null {
  const schema = getVizInput(key);
  if (!schema) return null;
  const skeleton: Record<string, unknown> = {};
  for (const f of schema.fields) skeleton[f.key] = fieldSkeleton(f);
  return [
    "아래 두 가지를 모두, 순서대로 출력하세요.",
    "",
    "1) 문서용 — 사람이 읽는 마크다운 서술형 보고서. 제목·문단·목록을 자유롭게 사용해 먼저 작성하세요. (사업계획서·문서에 그대로 들어갑니다)",
    "2) 시각화용 — 마지막에 아래 구조의 JSON을 ```json 코드블록으로 감싸 출력하세요. 키 이름은 그대로 두고 값만 채웁니다. (도식 자동 생성에 쓰입니다)",
    "",
    "시각화용 JSON 항목 설명:",
    ...schema.fields.map(fieldGuideLine),
    "",
    "시각화용 JSON 구조:",
    "```json",
    JSON.stringify(skeleton, null, 2),
    "```",
  ].join("\n");
}
