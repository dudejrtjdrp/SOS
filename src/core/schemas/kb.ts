/** Knowledge Base structured fields — the single source of truth a project
 *  carries. Every module can auto-inject these via `source: "kb:<key>"`. */

export interface KBFields {
  project_name?: string;
  service_description?: string;
  market?: string;
  target?: string;
  problem?: string;
  solution?: string;
  competitors?: string;
  business_model?: string;
  tech_stack?: string;
  revenue_model?: string;
  usp?: string;
  [k: string]: string | undefined;
}

export interface KBFieldMeta {
  key: keyof KBFields & string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
  /** 이 항목에 어떤 내용을 적어야 하는지에 대한 간결한 안내. */
  description?: string;
  /** '예시 보기'로 노출되는 작성 예시 (모두 동일한 가상 서비스 기준). */
  example?: string;
}

/** Order + labels drive the KB editor UI (docs/06 §2.2).
 *  description은 작성 가이드, example은 일관된 가상 서비스(자영업 리뷰 관리 SaaS)
 *  기준의 작성 예시다. */
export const KB_FIELDS: KBFieldMeta[] = [
  {
    key: "project_name",
    label: "프로젝트명",
    type: "text",
    placeholder: "예: 리뷰메이트",
    description: "서비스를 부르는 이름. 아직 정해지지 않았다면 가칭이라도 적으세요.",
    example: "리뷰메이트",
  },
  {
    key: "service_description",
    label: "서비스 설명",
    type: "textarea",
    placeholder: "한 문단으로 서비스를 설명하세요",
    description:
      "무엇을·누구에게·어떻게 제공하는지 한두 문장으로. 모든 AI가 가장 먼저 참고하는 핵심 설명입니다.",
    example:
      "네이버·구글·배달앱에 흩어진 고객 리뷰를 한곳에 모아, AI가 가게 말투에 맞는 답글 초안을 자동 작성하고 부정 리뷰를 실시간 알림으로 알려주는 자영업자용 리뷰 관리 서비스.",
  },
  {
    key: "market",
    label: "시장",
    type: "textarea",
    description:
      "어떤 산업·카테고리에 속하는지와 대략적인 규모·범위. 시장을 명확히 정의할수록 분석이 날카로워집니다.",
    example:
      "국내 자영업 리뷰·평판 관리 SaaS 시장. 외식·뷰티·생활서비스 등 리뷰가 매출에 직결되는 오프라인 자영업 약 200만 사업장이 대상.",
  },
  {
    key: "target",
    label: "타겟 고객",
    type: "textarea",
    description:
      "가장 중요한 핵심 고객이 누구인지. 나이·상황·역할 등으로 구체적으로 좁힐수록 좋습니다.",
    example:
      "리뷰 응대에 쓸 시간이 부족한 1인~소규모 운영 자영업 사장님. 특히 배달·예약 비중이 높은 30~50대 외식업·뷰티업 운영자.",
  },
  {
    key: "problem",
    label: "문제",
    type: "textarea",
    description:
      "고객이 겪는 진짜 불편이나 결핍. '왜 이것이 문제인지'가 드러나게 적으세요.",
    example:
      "사장님이 여러 플랫폼에 흩어진 리뷰를 일일이 확인하고 답글을 달기 어렵다. 부정 리뷰를 늦게 발견해 별점과 매출이 함께 떨어진다.",
  },
  {
    key: "solution",
    label: "솔루션",
    type: "textarea",
    description:
      "그 문제를 어떻게 해결하는지. 기능 나열보다 '문제를 어떻게 없애는지'에 초점을 두세요.",
    example:
      "모든 채널 리뷰를 한 대시보드에 통합하고, AI가 가게 톤에 맞는 답글 초안을 제안한다. 부정 리뷰는 즉시 알림으로 보내 골든타임 안에 대응하게 한다.",
  },
  {
    key: "competitors",
    label: "경쟁사",
    type: "textarea",
    description:
      "고객이 지금 대신 쓰는 대안들. 직접 경쟁사뿐 아니라 '아무것도 안 쓰기' 같은 대체 수단도 포함하세요.",
    example:
      "직접 경쟁: 더플랜잇, 데이터블 등 리뷰 관리 솔루션 / 대체재: 네이버 스마트플레이스·배달앱 내장 리뷰 기능, 사장님이 직접 수기 응대.",
  },
  {
    key: "business_model",
    label: "비즈니스 모델",
    type: "textarea",
    description:
      "어떻게 가치를 전달하고 돈을 버는 구조인지. B2B/B2C, 판매·유통 방식 등을 적으세요.",
    example:
      "월 구독형 B2B SaaS. 매장 수·연동 채널 수에 따른 티어 요금제, 프랜차이즈 본사 대상 다점포 관리 플랜 별도.",
  },
  {
    key: "tech_stack",
    label: "기술 스택",
    type: "text",
    description: "서비스를 구현하는 주요 기술·도구. 핵심만 간단히 적으세요.",
    example: "Next.js, Supabase, OpenAI API, 플랫폼 리뷰 연동 파이프라인",
  },
  {
    key: "revenue_model",
    label: "수익 모델",
    type: "textarea",
    description:
      "구체적으로 어디서 매출이 나는지. 요금제·단가·과금 방식까지 적으면 좋습니다.",
    example:
      "매장당 월 29,000원 기본 요금. 다점포 관리·API 연동·고급 분석은 상위 플랜으로 업셀.",
  },
  {
    key: "usp",
    label: "USP (차별점)",
    type: "textarea",
    description:
      "경쟁자가 아닌 우리만 줄 수 있는 차별점. '남들과 달리 ~' 형태로 적으면 명확해집니다.",
    example:
      "단일 채널만 보는 경쟁사와 달리 전 채널 리뷰를 통합하고, 가게별 말투를 학습한 AI 답글로 응대 시간을 90% 줄인다.",
  },
];

export function kbCompleteness(fields: KBFields): number {
  const filled = KB_FIELDS.filter((f) => (fields[f.key] ?? "").trim().length > 0).length;
  return Math.round((filled / KB_FIELDS.length) * 100);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Format round-trip — copy an empty, labelled template + a filling prompt to
 * paste into ChatGPT/Claude alongside existing material (사업계획서·IR덱 등);
 * the model fills each section in place, and the result pastes back into the
 * KB via `parseKBFormat`. Heading marker (`## label`) is kept consistent with
 * KBQuickPanel's "전체 복사" so both directions speak the same shape.
 * ────────────────────────────────────────────────────────────────────────── */

/** Heading marker that prefixes each field label in the copy/paste format. */
export const KB_FORMAT_MARKER = "##";

/**
 * Build the clipboard payload for the "형식 복사" action: an instruction prompt
 * plus the empty labelled format. The user pastes this into an external AI
 * together with their existing documents and gets back the same shape filled in.
 */
export function buildKBFormatPrompt(): string {
  const header = [
    "아래는 스타트업 정보를 정리하기 위한 「형식」입니다.",
    "제가 함께 제공하는 자료(사업계획서·IR덱·서비스 소개·메모 등)를 읽고,",
    "그 내용을 아래 형식의 각 항목에 맞게 채워서 형식 그대로 다시 출력해 주세요.",
    "",
    "[규칙]",
    `- 각 항목의 제목 줄(\`${KB_FORMAT_MARKER} 항목명\`)은 절대 바꾸지 말고 그대로 두세요.`,
    "- 제목 줄 바로 아래에 해당 내용을 한국어로 작성하세요.",
    "- 자료에서 알 수 없는 항목은 내용 없이 제목 줄만 남겨 두세요.",
    "- `>` 로 시작하는 안내 줄은 참고만 하고, 출력에는 포함하지 마세요.",
    "- 형식 밖의 인사말·부연 설명·코드블록은 출력하지 마세요.",
    "",
    "─────────────────────────────",
  ].join("\n");

  const body = KB_FIELDS.map((f) => {
    const hint = f.description ? `\n> ${f.description}` : "";
    return `${KB_FORMAT_MARKER} ${f.label}${hint}\n`;
  }).join("\n");

  return `${header}\n\n${body}`;
}

/** Normalize a candidate heading line so label/marker/format noise is ignored
 *  when matching it against a known field (e.g. "## USP (차별점)" → "usp차별점"). */
function normalizeHeading(line: string): string {
  return line
    .trim()
    .replace(/^[\s#>■◆●○*\-•‣·–—]+/, "") // leading markers / bullets
    .replace(/[\s*:：.\)\]\}】）]+$/, "") // trailing markers / punctuation
    .replace(/[()（）]/g, "") // drop parentheses entirely
    .replace(/\s+/g, "") // drop inner whitespace
    .toLowerCase();
}

/** Build the lookup of accepted (normalized) headings → field key. Accepts each
 *  field's label and key, plus a few aliases for labels carrying English /
 *  parenthetical terms so shortened headings still match. */
function buildHeadingMatchers(): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of KB_FIELDS) {
    m.set(normalizeHeading(f.label), f.key);
    m.set(normalizeHeading(f.key), f.key);
  }
  const aliases: Record<string, string> = {
    USP: "usp",
    차별점: "usp",
    타겟: "target",
    "타겟 고객": "target",
    경쟁자: "competitors",
  };
  for (const [alias, key] of Object.entries(aliases)) m.set(normalizeHeading(alias), key);
  return m;
}

/** Content that means "left blank" — skipped rather than written to the field. */
const KB_PLACEHOLDER =
  /^(\(?\s*(자료\s*없음|내용\s*없음|해당\s*없음|정보\s*없음|미상|없음|n\/?a|tbd|여기에\s*내용)\s*\)?|[-–—.]|)$/i;

/**
 * Parse text produced from `buildKBFormatPrompt` (or a close LLM rendering) back
 * into KB fields. Tolerant of bold/heading markers, code fences, `label: value`
 * on one line, guidance (`>`) lines, and missing sections. Only non-empty,
 * non-placeholder sections are returned, keyed by KB field key.
 */
export function parseKBFormat(input: string): Record<string, string> {
  const matchers = buildHeadingMatchers();
  const sections: Record<string, string[]> = {};
  let current: string | null = null;

  const lines = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => !/^\s*```/.test(l)); // strip any code-fence lines

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      if (current) sections[current].push("");
      continue;
    }
    if (line.startsWith(">")) continue; // guidance line — ignore

    // Whole line is a known heading.
    let key = matchers.get(normalizeHeading(line));
    let inlineValue: string | undefined;

    // Or "label: value" on a single line.
    if (!key) {
      const ci = line.search(/[:：]/);
      if (ci > 0) {
        const k = matchers.get(normalizeHeading(line.slice(0, ci)));
        if (k) {
          key = k;
          inlineValue = line.slice(ci + 1).trim();
        }
      }
    }

    if (key) {
      current = key;
      if (!sections[key]) sections[key] = [];
      if (inlineValue) sections[key].push(inlineValue);
      continue;
    }

    if (current) sections[current].push(raw.trimEnd());
  }

  const result: Record<string, string> = {};
  for (const [key, buf] of Object.entries(sections)) {
    const value = buf.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!value || KB_PLACEHOLDER.test(value)) continue;
    result[key] = value;
  }
  return result;
}
