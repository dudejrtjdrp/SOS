import type { SeedModule } from "../types";
import { validation, kbv, common, out, str, num, list, objs } from "../helpers";

const CRITIC =
  "너는 까다로운 투자 심사역이자 린스타트업 코치다. 낙관 편향을 경계하고 검증 가능한 가설과 반증 조건을 제시한다.";

export const validationModules: SeedModule[] = [
  validation("problem_validation", "Problem Validation", "문제 검증", {
    system: CRITIC,
    instructions:
      "문제가 실재하는지 검증할 가설, 검증 방법, 성공/실패 기준, 인터뷰 대상을 제시하라.",
    vars: [
      kbv("problem", "문제", { desc: "실재 여부를 검증할 핵심 문제." }),
      kbv("target", "타겟 고객", { desc: "이 문제를 겪는다고 보는 대상." }),
      kbv("service_description", "서비스 설명", { desc: "맥락." }),
      ...common,
    ],
    output: out({
      hypotheses: list("검증 가설"),
      methods: list("검증 방법"),
      success_criteria: str("성공 기준"),
      kill_criteria: str("중단(반증) 기준"),
    }),
  }),

  validation("solution_validation", "Solution Validation", "솔루션 검증", {
    system: CRITIC,
    instructions:
      "솔루션이 문제를 푸는지 검증할 MVP 실험, 측정 지표, 기대 결과를 제시하라.",
    vars: [
      kbv("problem", "문제", { desc: "솔루션이 풀어야 할 문제." }),
      kbv("solution", "솔루션", { desc: "검증할 솔루션." }),
      kbv("target", "타겟 고객", { desc: "실험 대상 고객." }),
      ...common,
    ],
    output: out({
      experiments: objs(
        "실험",
        { experiment: str("실험"), metric: str("지표"), expected: str("기대 결과") },
        2,
      ),
      riskiest_assumption: str("가장 위험한 가정"),
    }),
  }),

  validation("pmf_score", "PMF Score", "제품-시장 적합도 점수", {
    system: CRITIC,
    task_class: "reasoning",
    instructions:
      "문제 강도·솔루션 적합·시장 규모·차별성·근거 5개 차원을 0~10으로 평가하고, 총점(0~10)과 개선 우선순위를 제시하라. 각 차원은 입력값에 근거하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "평가 대상." }),
      kbv("problem", "문제", { desc: "문제 강도 차원의 근거." }),
      kbv("solution", "솔루션", { desc: "솔루션 적합 차원의 근거." }),
      kbv("target", "타겟 고객", { desc: "누구를 위한 적합인지." }),
      kbv("market", "시장", { desc: "시장 규모 차원의 근거." }),
      kbv("competitors", "경쟁사", { desc: "차별성 차원의 근거. 쉼표·줄로 구분." }),
      ...common,
    ],
    output: out({
      problem_intensity: num("문제 강도(0-10)"),
      solution_fit: num("솔루션 적합(0-10)"),
      market_size: num("시장 규모(0-10)"),
      differentiation: num("차별성(0-10)"),
      evidence: num("근거(0-10)"),
      total: num("총점(0-10)"),
      priorities: list("개선 우선순위"),
    }),
  }),

  validation("risk_analysis", "Risk Analysis", "리스크 분석", {
    system: CRITIC,
    instructions:
      "시장·기술·실행·재무·규제 리스크를 도출하고 발생가능성·영향·완화책을 제시하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "리스크를 볼 사업." }),
      kbv("problem", "문제", { desc: "맥락." }),
      kbv("solution", "솔루션", { desc: "실행·기술 리스크의 근거." }),
      kbv("market", "시장", { desc: "시장·규제 리스크의 근거." }),
      ...common,
    ],
    output: out({
      risks: objs(
        "리스크",
        {
          risk: str("리스크"),
          category: str("분류"),
          likelihood: str("발생가능성(높음/중간/낮음)"),
          impact: str("영향(높음/중간/낮음)"),
          mitigation: str("완화책"),
        },
        3,
      ),
    }),
  }),
];
