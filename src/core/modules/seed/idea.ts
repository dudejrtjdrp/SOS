import type { SeedModule } from "../types";
import { idea, kbv, inp, common, out, str, list, objs } from "../helpers";

const INNOVATOR =
  "너는 0→1 아이디어를 잘 만드는 창업 코치다. 진부함을 피하고 실행 가능하면서도 신선한 발상을 제시한다.";

export const ideaModules: SeedModule[] = [
  idea("brainstorm", "Brainstorm", "주제에 대한 아이디어 발산", {
    system: INNOVATOR,
    instructions: "주제에 대해 서로 다른 각도의 아이디어 8개를 내고, 가장 유망한 1개를 선정하라.",
    vars: [
      inp("topic", "주제·영역", {
        desc: "탐색할 주제나 문제 영역. 좁게 적을수록 날카로운 아이디어가 나옵니다.",
        placeholder: "예) 1인 카페의 재방문율 높이기",
      }),
      kbv("market", "시장", { desc: "아이디어가 향할 시장 맥락. (선택)" }),
      ...common,
    ],
    output: out({
      ideas: objs("아이디어", { title: str("제목"), description: str("설명") }, 5),
      top_idea: str("가장 유망한 아이디어와 이유"),
    }),
  }),

  idea("scamper", "SCAMPER", "7가지 변형 기법", {
    system: INNOVATOR,
    instructions:
      "기존 서비스/제품을 대체·결합·응용·수정·다른용도·제거·역발상(SCAMPER)으로 변형한 아이디어를 각각 제시하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "변형의 출발점이 되는 기존 서비스/제품." }),
      ...common,
    ],
    output: out({
      substitute: str("대체(S)"),
      combine: str("결합(C)"),
      adapt: str("응용(A)"),
      modify: str("수정(M)"),
      put_to_other_use: str("다른 용도(P)"),
      eliminate: str("제거(E)"),
      reverse: str("역발상(R)"),
    }),
  }),

  idea("reverse_thinking", "Reverse Thinking", "역발상 문제 해결", {
    system: INNOVATOR,
    instructions:
      "'어떻게 하면 최악으로 실패할까?'를 먼저 도출한 뒤, 이를 뒤집어 개선 아이디어로 전환하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "뒤집어 볼 대상 서비스/제품." }),
      ...common,
    ],
    output: out({
      ways_to_fail: list("실패하는 방법"),
      inverted_insights: list("뒤집어 얻은 개선 아이디어"),
    }),
  }),

  idea("random_combination", "Random Combination", "강제 결합 발상", {
    system: INNOVATOR,
    instructions:
      "서비스 영역과 무관해 보이는 개념들을 강제로 결합해 새로운 아이디어 5개를 만들어라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "강제 결합의 한 축이 되는 우리 서비스." }),
      ...common,
    ],
    output: out({
      combinations: objs("결합", { pairing: str("결합 대상"), idea: str("아이디어") }, 3),
    }),
  }),

  idea("pain_point", "Pain Point Discovery", "고통점 발굴", {
    system: INNOVATOR,
    instructions:
      "타겟 고객의 일상에서 반복되는 고통점을 빈도·심각도와 함께 도출하고, 각 고통점에 대한 기회를 제시하라.",
    vars: [
      kbv("target", "타겟 고객", { desc: "고통점을 발굴할 대상 고객." }),
      kbv("market", "시장", { desc: "고객이 처한 시장 맥락." }),
      ...common,
    ],
    output: out({
      pains: objs(
        "고통점",
        {
          pain: str("고통점"),
          frequency: str("빈도"),
          severity: str("심각도"),
          opportunity: str("기회"),
        },
        4,
      ),
    }),
  }),

  idea("event_idea", "출품·참가 아이디어", "공모전·해커톤·지원사업 출품 아이디어", {
    system: INNOVATOR,
    instructions:
      "주어진 행사(행사명·주제)와 우리 팀의 역량(서비스·타겟)을 결합해, 그 행사에 '무엇을 만들어 출품/참가할지' 프로젝트·서비스 컨셉 5개를 제시하라. 각 아이디어는 행사 주제와의 적합성과 우리만의 차별점을 분명히 하고, 진부한 발상은 피한다. 비고에 제출 요건·심사 기준·제약이 있으면 반드시 반영하고, 마지막에 가장 유망한 출품작 1개를 이유와 함께 선정하라.",
    vars: [
      inp("event_name", "행사명", {
        type: "text",
        desc: "참가하려는 공모전·해커톤·지원사업 이름.",
        placeholder: "예) 2026 예비창업패키지",
      }),
      inp("event_topic", "행사 주제", {
        type: "text",
        desc: "행사가 요구하는 주제·분야. 아이디어의 방향을 잡습니다.",
        placeholder: "예) AI·데이터 기반 친환경 솔루션",
      }),
      inp("note", "비고", {
        desc: "제출 요건·심사 기준·우대 분야·제약 등 참고사항. (선택)",
        placeholder: "예) 헬스케어 분야 우대, 5분 발표, MVP 데모 필수",
      }),
      kbv("service_description", "서비스 설명", {
        desc: "우리 팀이 만들 수 있는 것의 출발점. (선택)",
      }),
      kbv("target", "타겟 고객", { desc: "아이디어가 향할 고객. (선택)" }),
      ...common,
    ],
    output: out({
      ideas: objs(
        "출품 아이디어",
        {
          title: str("제목"),
          concept: str("한 줄 컨셉"),
          fit: str("행사 주제 적합성"),
          differentiation: str("차별점"),
          feasibility: str("실현 메모(범위·필요 역량)"),
        },
        4,
      ),
      top_pick: str("가장 유망한 출품작과 이유"),
    }),
  }),
];
