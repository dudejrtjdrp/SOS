/**
 * Visualization registry (Phase 3). Pure, framework-agnostic: each tool maps its
 * structured artifact content → a typed VizModel that the React <Viz> renderer
 * draws. Multiple templates per tool are allowed. No React, no DB — unit-testable.
 */

export type Tone = "pos" | "neg" | "neutral";

export interface Quadrant {
  key: string;
  title: string;
  items: string[];
  tone: Tone;
}
export interface Column {
  key: string;
  title: string;
  tone?: Tone;
  items: string[];
}
export interface PosItem {
  id: string;
  label: string;
  emphasis?: boolean;
}
export interface PosAxes {
  xLeft: string;
  xRight: string;
  yBottom: string;
  yTop: string;
}
export interface ForceNode {
  key: string;
  title: string;
  level: string;
  rationale: string;
}
export interface CanvasBlock {
  key: string;
  title: string;
  items: string[];
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
}
export interface FunnelStage {
  key: string;
  title: string;
  metric: string;
  items: string[];
}
export interface HubNode {
  key: string;
  title: string;
  text: string;
  group: "hard" | "soft";
}

export type VizModel =
  | { type: "matrix2x2"; xLabel?: string; yLabel?: string; quadrants: Quadrant[] }
  | { type: "columns"; columns: Column[]; note?: { title: string; text: string } }
  | { type: "positioning"; items: PosItem[]; axes: PosAxes }
  | { type: "forces"; center: ForceNode; around: ForceNode[]; summary?: string }
  | { type: "canvas"; cols: number; blocks: CanvasBlock[] }
  | { type: "funnel"; stages: FunnelStage[] }
  | { type: "hub"; center: HubNode; around: HubNode[]; note?: { title: string; text: string } };

export interface VizDef {
  id: string;
  name: string;
  build: (content: Record<string, unknown>) => VizModel | null;
}

// ── content coercion (structured fields can be string | string[] | {value} | obj) ──

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>).value ?? "");
  }
  return "";
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        typeof x === "string"
          ? x
          : x && typeof x === "object" && "value" in (x as Record<string, unknown>)
            ? asText(x)
            : typeof x === "object"
              ? Object.values(x as Record<string, unknown>).map(asText).filter(Boolean).join(" — ")
              : String(x),
      )
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const t = asText(v);
  return t ? [t] : [];
}

function objOf(content: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = content[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function arrOf(content: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = content[key];
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : [];
}

/** Short, dot-friendly label from a possibly-long analytical string. */
export function shortLabel(s: string, max = 16): string {
  const head = s.split(/[—:\-(]/)[0].trim() || s.trim();
  return head.length > max ? head.slice(0, max - 1) + "…" : head;
}

function catItems(products: Record<string, unknown>[], keywords: string[]): string[] {
  return products
    .filter((p) => {
      const c = asText(p.category).toLowerCase();
      return keywords.some((k) => c.includes(k));
    })
    .map((p) => asText(p.name))
    .filter(Boolean);
}

// ── per-tool templates ────────────────────────────────────────────

export const MODULE_VIZ: Record<string, VizDef[]> = {
  swot: [
    {
      id: "swot-matrix",
      name: "2×2 매트릭스",
      build: (c) => ({
        type: "matrix2x2",
        quadrants: [
          { key: "strengths", title: "강점 (S)", items: asList(c.strengths), tone: "pos" },
          { key: "weaknesses", title: "약점 (W)", items: asList(c.weaknesses), tone: "neg" },
          { key: "opportunities", title: "기회 (O)", items: asList(c.opportunities), tone: "pos" },
          { key: "threats", title: "위협 (T)", items: asList(c.threats), tone: "neg" },
        ],
      }),
    },
  ],

  three_c: [
    {
      id: "three-c-columns",
      name: "3C 패널",
      build: (c) => {
        const impl = asText(c.implication);
        return {
          type: "columns",
          columns: [
            { key: "company", title: "자사 (Company)", items: asList(c.company), tone: "pos" },
            { key: "customer", title: "고객 (Customer)", items: asList(c.customer), tone: "neutral" },
            { key: "competitor", title: "경쟁사 (Competitor)", items: asList(c.competitor), tone: "neg" },
          ],
          note: impl ? { title: "전략적 시사점", text: impl } : undefined,
        };
      },
    },
    {
      id: "three-c-positioning",
      name: "포지셔닝 맵",
      build: (c) => {
        const comps = asList(c.competitor).slice(0, 8);
        const items: PosItem[] = [
          { id: "us", label: "우리", emphasis: true },
          ...comps.map((t, i) => ({ id: `c${i}`, label: shortLabel(t) })),
        ];
        return {
          type: "positioning",
          items,
          axes: { xLeft: "저가", xRight: "고가", yBottom: "낮은 차별성", yTop: "높은 차별성" },
        };
      },
    },
  ],

  stp: [
    {
      id: "stp-positioning",
      name: "포지셔닝 맵",
      build: (c) => {
        const segs = arrOf(c, "segmentation").slice(0, 8);
        if (segs.length === 0) return null;
        return {
          type: "positioning",
          items: segs.map((s, i) => ({ id: `s${i}`, label: shortLabel(asText(s.name) || `세그먼트 ${i + 1}`) })),
          axes: { xLeft: "틈새", xRight: "대중", yBottom: "저가", yTop: "프리미엄" },
        };
      },
    },
    {
      id: "stp-summary",
      name: "요약",
      build: (c) => {
        const segs = arrOf(c, "segmentation");
        const t = asText(c.targeting);
        const p = asText(c.positioning);
        return {
          type: "columns",
          columns: [
            {
              key: "seg",
              title: "세분화 (S)",
              items: segs.map((s) => {
                const name = asText(s.name);
                const desc = asText(s.description);
                return desc ? `${name} — ${desc}` : name;
              }),
            },
          ],
          note: { title: "타겟팅 (T) · 포지셔닝 (P)", text: [t, p].filter(Boolean).join("\n\n") },
        };
      },
    },
  ],

  bcg_matrix: [
    {
      id: "bcg-matrix",
      name: "BCG 매트릭스",
      build: (c) => {
        const products = arrOf(c, "products");
        if (products.length === 0) return null;
        return {
          type: "matrix2x2",
          xLabel: "상대 시장점유율  (고 ←→ 저)",
          yLabel: "시장 성장률  (저 ↓↑ 고)",
          quadrants: [
            { key: "star", title: "Star", items: catItems(products, ["star", "스타"]), tone: "pos" },
            { key: "question", title: "Question Mark", items: catItems(products, ["question", "물음", "?"]), tone: "neutral" },
            { key: "cash_cow", title: "Cash Cow", items: catItems(products, ["cash", "cow", "캐시", "젖소"]), tone: "pos" },
            { key: "dog", title: "Dog", items: catItems(products, ["dog", "개"]), tone: "neg" },
          ],
        };
      },
    },
  ],

  porter_five: [
    {
      id: "porter-forces",
      name: "5 Forces",
      build: (c) => {
        const node = (k: string, title: string): ForceNode => {
          const o = objOf(c, k);
          return { key: k, title, level: asText(o.level), rationale: asText(o.rationale) };
        };
        return {
          type: "forces",
          center: node("rivalry", "기존 경쟁 강도"),
          around: [
            node("new_entrants", "신규 진입 위협"),
            node("suppliers", "공급자 교섭력"),
            node("buyers", "구매자 교섭력"),
            node("substitutes", "대체재 위협"),
          ],
          summary: asText(c.attractiveness),
        };
      },
    },
  ],

  business_model_canvas: [
    {
      id: "bmc",
      name: "비즈니스 모델 캔버스",
      build: (c) => ({
        type: "canvas",
        cols: 10,
        blocks: [
          { key: "key_partners", title: "핵심 파트너", items: asList(c.key_partners), col: 1, row: 1, colSpan: 2, rowSpan: 2 },
          { key: "key_activities", title: "핵심 활동", items: asList(c.key_activities), col: 3, row: 1, colSpan: 2 },
          { key: "key_resources", title: "핵심 자원", items: asList(c.key_resources), col: 3, row: 2, colSpan: 2 },
          { key: "value_propositions", title: "가치 제안", items: asList(c.value_propositions), col: 5, row: 1, colSpan: 2, rowSpan: 2 },
          { key: "customer_relationships", title: "고객 관계", items: asList(c.customer_relationships), col: 7, row: 1, colSpan: 2 },
          { key: "channels", title: "채널", items: asList(c.channels), col: 7, row: 2, colSpan: 2 },
          { key: "customer_segments", title: "고객 세그먼트", items: asList(c.customer_segments), col: 9, row: 1, colSpan: 2, rowSpan: 2 },
          { key: "cost_structure", title: "비용 구조", items: asList(c.cost_structure), col: 1, row: 3, colSpan: 5 },
          { key: "revenue_streams", title: "수익원", items: asList(c.revenue_streams), col: 6, row: 3, colSpan: 5 },
        ],
      }),
    },
  ],

  lean_canvas: [
    {
      id: "lean",
      name: "린 캔버스",
      build: (c) => ({
        type: "canvas",
        cols: 10,
        blocks: [
          { key: "problem", title: "문제", items: asList(c.problem), col: 1, row: 1, colSpan: 2, rowSpan: 2 },
          { key: "solution", title: "솔루션", items: asList(c.solution), col: 3, row: 1, colSpan: 2 },
          { key: "key_metrics", title: "핵심 지표", items: asList(c.key_metrics), col: 3, row: 2, colSpan: 2 },
          { key: "unique_value_proposition", title: "고유 가치 제안", items: asList(c.unique_value_proposition), col: 5, row: 1, colSpan: 2, rowSpan: 2 },
          { key: "unfair_advantage", title: "불공정 우위", items: asList(c.unfair_advantage), col: 7, row: 1, colSpan: 2 },
          { key: "channels", title: "채널", items: asList(c.channels), col: 7, row: 2, colSpan: 2 },
          { key: "customer_segments", title: "고객 세그먼트", items: asList(c.customer_segments), col: 9, row: 1, colSpan: 2, rowSpan: 2 },
          { key: "cost_structure", title: "비용 구조", items: asList(c.cost_structure), col: 1, row: 3, colSpan: 5 },
          { key: "revenue_streams", title: "수익원", items: asList(c.revenue_streams), col: 6, row: 3, colSpan: 5 },
        ],
      }),
    },
  ],

  aarrr: [
    {
      id: "aarrr-funnel",
      name: "AARRR 퍼널",
      build: (c) => {
        const stage = (k: string, title: string): FunnelStage => {
          const o = objOf(c, k);
          return { key: k, title, metric: asText(o.metric), items: asList(o.tactics) };
        };
        return {
          type: "funnel",
          stages: [
            stage("acquisition", "획득 (Acquisition)"),
            stage("activation", "활성화 (Activation)"),
            stage("retention", "유지 (Retention)"),
            stage("revenue", "수익 (Revenue)"),
            stage("referral", "추천 (Referral)"),
          ],
        };
      },
    },
  ],

  seven_s: [
    {
      id: "seven-s-hub",
      name: "7S 다이어그램",
      build: (c) => {
        const n = (k: string, title: string, group: "hard" | "soft"): HubNode => ({
          key: k,
          title,
          text: asText(c[k]),
          group,
        });
        return {
          type: "hub",
          center: n("shared_values", "공유 가치 (Shared Values)", "soft"),
          around: [
            n("strategy", "전략 (Strategy)", "hard"),
            n("structure", "구조 (Structure)", "hard"),
            n("systems", "시스템 (Systems)", "hard"),
            n("style", "스타일 (Style)", "soft"),
            n("staff", "구성원 (Staff)", "soft"),
            n("skills", "역량 (Skills)", "soft"),
          ],
          note: asText(c.alignment) ? { title: "정합성 진단", text: asText(c.alignment) } : undefined,
        };
      },
    },
  ],
};

/** Templates available for a module key (empty if none). */
export function getViz(key: string | null | undefined): VizDef[] {
  return (key && MODULE_VIZ[key]) || [];
}
