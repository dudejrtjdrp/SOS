import type { SeedModule } from "../types";
import { research, kbv, inp, common, out, str, list, objs } from "../helpers";

const ANALYST =
  "너는 시장조사 전문가다. 근거 없는 수치는 만들지 말고, 추정 시 가정과 계산 과정을 명시하며 '추정'으로 표기한다.";

export const researchModules: SeedModule[] = [
  research("tam_sam_som", "TAM-SAM-SOM", "시장 규모 산정", {
    system: ANALYST,
    task_class: "reasoning",
    instructions:
      "TAM·SAM·SOM을 top-down과 bottom-up 두 방식으로 추정하라. bottom-up은 (도달 가능한 고객 수 × 고객당 연 단가)로 계산하고, 입력한 단가·지역이 있으면 반드시 반영하라. 가정·계산·단위·추정 근거를 모두 명시하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "시장을 추정할 사업." }),
      kbv("market", "시장", { desc: "TAM의 출발이 되는 전체 시장." }),
      kbv("target", "타겟 고객", { desc: "SAM·SOM을 좁히는 핵심 고객(고객 수 산정)." }),
      inp("price", "고객당 연 단가(ARPU)", {
        desc: "고객 1명이 1년에 내는 평균 금액. bottom-up 계산(고객 수 × 단가)의 핵심. (선택)",
        placeholder: "예) 연 348,000원",
      }),
      inp("geography", "지역·범위", {
        desc: "SAM을 좁힐 지역/세그먼트. (선택)",
        placeholder: "예) 국내 수도권",
      }),
      ...common,
    ],
    output: out({
      tam: obj_("TAM"),
      sam: obj_("SAM"),
      som: obj_("SOM"),
      assumptions: list("핵심 가정"),
    }),
  }),

  research("competitor_scan", "경쟁사 조사", "경쟁사 비교 분석", {
    system: ANALYST,
    instructions:
      "주요 경쟁사를 식별하고 강점·약점·가격·차별점을 비교한 뒤, 우리의 포지셔닝 기회를 도출하라.",
    vars: [
      kbv("competitors", "경쟁사", {
        desc: "비교할 경쟁사. 비우면 AI가 후보를 식별합니다. 쉼표·줄로 구분.",
      }),
      kbv("service_description", "서비스 설명", { desc: "비교 기준이 되는 우리 서비스." }),
      kbv("market", "시장", { desc: "경쟁 구도를 볼 시장." }),
      kbv("target", "타겟 고객", { desc: "누구를 두고 경쟁하는지." }),
      ...common,
    ],
    output: out({
      competitors: objs(
        "경쟁사",
        {
          name: str("이름"),
          strengths: str("강점"),
          weaknesses: str("약점"),
          pricing: str("가격"),
          differentiation: str("차별점"),
        },
        2,
      ),
      positioning_gap: str("우리의 포지셔닝 기회"),
    }),
  }),

  research("market_size", "시장 규모", "규모·성장률 추정", {
    system: ANALYST,
    instructions: "시장 규모와 성장률(CAGR)을 추정하고 근거와 출처 유형을 명시하라. 입력한 지역이 있으면 그 범위로 한정하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "규모를 볼 사업." }),
      kbv("market", "시장", { desc: "규모·성장률을 추정할 시장." }),
      inp("region", "지역·범위", {
        desc: "규모를 한정할 지역. 비우면 국내/전체 기준. (선택)",
        placeholder: "예) 국내",
      }),
      ...common,
    ],
    output: out({
      current_size: str("현재 규모(추정)"),
      growth_rate: str("성장률 CAGR(추정)"),
      drivers: list("성장 동인"),
      basis: str("추정 근거"),
    }),
  }),

  research("trends", "트렌드 분석", "관련 트렌드 도출", {
    system: ANALYST,
    instructions: "해당 시장의 최신 트렌드 5개와 각 트렌드가 사업에 주는 함의를 제시하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "트렌드를 볼 사업." }),
      kbv("market", "시장", { desc: "트렌드를 살필 시장." }),
      kbv("target", "타겟 고객", { desc: "트렌드의 영향을 받는 고객. (선택)" }),
      ...common,
    ],
    output: out({
      trends: objs("트렌드", { trend: str("트렌드"), implication: str("사업 함의") }, 3),
    }),
  }),

  research("industry_analysis", "산업 분석", "산업 구조·밸류체인", {
    system: ANALYST,
    instructions: "산업 구조, 주요 플레이어, 밸류체인, 규제 환경, 진입장벽을 정리하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "산업 내 우리 위치의 기준." }),
      kbv("market", "시장", { desc: "분석할 산업." }),
      ...common,
    ],
    output: out({
      structure: str("산업 구조"),
      key_players: list("주요 플레이어"),
      value_chain: str("밸류체인"),
      regulation: str("규제 환경"),
      barriers: list("진입장벽"),
    }),
  }),

  research("customer_research", "고객 조사", "고객 세그먼트·니즈", {
    system: ANALYST,
    instructions: "핵심 고객 세그먼트, 니즈, 구매 결정 요인, 미충족 니즈를 도출하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "누구를 위한 서비스인지." }),
      kbv("market", "시장", { desc: "고객이 속한 시장." }),
      kbv("target", "타겟 고객", { desc: "조사할 핵심 고객." }),
      ...common,
    ],
    output: out({
      segments: objs("세그먼트", { name: str("세그먼트"), needs: str("니즈") }, 2),
      buying_factors: list("구매 결정 요인"),
      unmet_needs: list("미충족 니즈"),
    }),
  }),

  research("interview_questions", "인터뷰 질문 생성", "고객 인터뷰 가이드", {
    system: ANALYST,
    instructions:
      "The Mom Test 원칙에 따라 유도하지 않는 고객 인터뷰 질문을 단계별(과거 행동·문제·대안)로 생성하라. 검증할 문제가 입력되면 그 문제에 초점을 맞춰라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "인터뷰로 검증할 서비스." }),
      kbv("target", "타겟 고객", { desc: "인터뷰 대상." }),
      kbv("problem", "검증할 문제", { desc: "인터뷰로 확인하려는 문제. 비면 일반 탐색." }),
      ...common,
    ],
    output: out({
      warmup: list("워밍업 질문", 2),
      problem: list("문제 탐색 질문"),
      behavior: list("과거 행동 질문"),
      alternatives: list("대안/지불의사 질문", 2),
    }),
  }),

  research("reddit_analysis", "Reddit 분석", "커뮤니티 인사이트 가이드", {
    system: ANALYST,
    instructions:
      "어떤 서브레딧과 검색어로 무엇을 확인해야 하는지, 어떤 패턴(불만·대안·언어)을 수집할지 가이드를 제시하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "커뮤니티에서 신호를 찾을 주제." }),
      kbv("market", "시장", { desc: "관련 커뮤니티를 좁힐 시장." }),
      kbv("target", "타겟 고객", { desc: "어떤 사람들의 글을 볼지." }),
      ...common,
    ],
    output: out({
      subreddits: list("탐색할 서브레딧"),
      search_terms: list("검색어"),
      signals_to_collect: list("수집할 신호"),
    }),
  }),

  research("news_analysis", "뉴스 분석", "동향·이벤트 모니터링 가이드", {
    system: ANALYST,
    instructions: "모니터링할 키워드와 주요 이벤트 유형, 사업에 주는 시사점을 정리하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "모니터링 기준이 되는 사업." }),
      kbv("market", "시장", { desc: "뉴스를 추적할 시장." }),
      ...common,
    ],
    output: out({
      keywords: list("모니터링 키워드"),
      event_types: list("주목할 이벤트 유형"),
      implications: str("시사점"),
    }),
  }),
];

// local helper: a market-size object field with value + basis
function obj_(label: string) {
  return {
    type: "object" as const,
    label,
    fields: { value: str("값(추정)"), basis: str("근거") },
  };
}
