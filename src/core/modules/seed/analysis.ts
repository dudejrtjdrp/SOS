import type { SeedModule } from "../types";
import { analysis, kbv, inp, common, out, str, num, list, obj, objs } from "../helpers";

const CONSULTANT =
  "너는 맥킨지 출신의 노련한 전략 컨설턴트다. 일반론을 배격하고 이 사업에 고유한, 실행 가능한 통찰만 제시한다.";

// ── Reusable KB-backed inputs (description varies per tool, so passed inline) ──

export const analysisModules: SeedModule[] = [
  analysis("swot", "SWOT 분석", "강점·약점·기회·위협과 전략적 시사점", {
    system: CONSULTANT,
    instructions:
      "강점/약점/기회/위협을 각 3개 이상 구체적으로 도출하라. 강점·약점은 차별점·자원에서, 기회·위협은 시장·경쟁에서 끌어내고, 전략적 시사점은 입력한 목표(있으면)에 맞춰 SO·WT 관점으로 제시하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "분석 대상. S/W/O/T 판단의 기준입니다." }),
      kbv("usp", "핵심 차별점·자원", {
        desc: "강점(S)의 근거가 되는 우리만의 자원·역량. 비면 서비스 설명에서 추론합니다.",
      }),
      kbv("market", "시장", { desc: "기회(O)·위협(T)을 끌어낼 외부 환경." }),
      kbv("competitors", "경쟁사", { desc: "약점(W)·위협(T)을 가늠할 경쟁 구도. 쉼표·줄로 구분." }),
      inp("goal", "전략 목표", {
        desc: "이번 SWOT로 답하고 싶은 질문·목표가 있으면. (선택)",
        placeholder: "예) 6개월 내 유료 전환율 개선",
      }),
      ...common,
    ],
    output: out({
      strengths: list("강점"),
      weaknesses: list("약점"),
      opportunities: list("기회"),
      threats: list("위협"),
      strategic_implications: str("전략적 시사점"),
    }),
  }),

  analysis("pest", "PEST 분석", "정치·경제·사회·기술 거시환경", {
    system: CONSULTANT,
    instructions:
      "입력한 지역(없으면 한국)을 기준으로 정치/경제/사회/기술 요인을 각 3개 이상 도출하고 종합 시사점을 제시하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "거시환경이 영향을 주는 사업." }),
      kbv("market", "시장", { desc: "PEST가 작용하는 산업/시장." }),
      inp("region", "지역·국가", {
        desc: "분석 기준 지역. 거시환경은 지역마다 다릅니다. 비우면 한국 기준.",
        placeholder: "예) 한국, 동남아",
      }),
      ...common,
    ],
    output: out({
      political: list("정치"),
      economic: list("경제"),
      social: list("사회"),
      technological: list("기술"),
      summary: str("종합 시사점"),
    }),
  }),

  analysis("pestel", "PESTEL 분석", "PEST + 환경·법률", {
    system: CONSULTANT,
    instructions:
      "입력한 지역(없으면 한국)을 기준으로 정치/경제/사회/기술/환경/법률 요인을 각 2개 이상 도출하고 종합하라. 환경·법률은 해당 지역 규제에 근거하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "규제·환경 영향을 볼 사업." }),
      kbv("market", "시장", { desc: "분석할 산업/시장." }),
      inp("region", "지역·국가", {
        desc: "환경·법률 규제는 지역에 따라 크게 다릅니다. 기준 지역.",
        placeholder: "예) 한국, EU",
      }),
      ...common,
    ],
    output: out({
      political: list("정치", 2),
      economic: list("경제", 2),
      social: list("사회", 2),
      technological: list("기술", 2),
      environmental: list("환경", 2),
      legal: list("법률", 2),
      summary: str("종합 시사점"),
    }),
  }),

  analysis("porter_five", "Porter 5 Forces", "산업 구조 매력도 분석", {
    system: CONSULTANT,
    task_class: "reasoning",
    instructions:
      "5개 힘 각각에 강도(높음/중간/낮음)·근거·핵심 요인을 제시하고 산업 매력도를 종합 평가하라. 구매자 교섭력은 타겟 고객, 공급자 교섭력은 입력한 공급자·의존 요소, 대체재 위협은 입력한 대체재를 근거로 삼아라(비면 합리적으로 추론).",
    vars: [
      kbv("market", "산업·시장", { desc: "매력도를 평가할 산업." }),
      kbv("target", "구매자(고객)", { desc: "구매자 교섭력(buyer power) 판단 기준." }),
      kbv("competitors", "경쟁사", { desc: "기존 경쟁 강도(rivalry) 판단. 쉼표·줄로 구분." }),
      inp("suppliers", "핵심 공급자·의존 요소", {
        desc: "공급자 교섭력 판단용. 의존하는 부품·인력·플랫폼·API 등. (선택)",
        placeholder: "예) 클라우드, 결제대행, 핵심 개발 인력",
      }),
      inp("substitutes", "대체재", {
        desc: "같은 욕구를 다르게 푸는 대안. 대체재 위협 판단용. (선택)",
        placeholder: "예) 수기 관리, 엑셀, 대행업체",
      }),
      ...common,
    ],
    output: out({
      new_entrants: obj("신규 진입 위협", { level: str("강도"), rationale: str("근거") }),
      suppliers: obj("공급자 교섭력", { level: str("강도"), rationale: str("근거") }),
      buyers: obj("구매자 교섭력", { level: str("강도"), rationale: str("근거") }),
      substitutes: obj("대체재 위협", { level: str("강도"), rationale: str("근거") }),
      rivalry: obj("경쟁 강도", { level: str("강도"), rationale: str("근거") }),
      attractiveness: str("산업 매력도 종합"),
    }),
  }),

  analysis("bcg_matrix", "BCG Matrix", "제품 포트폴리오 분석", {
    system: CONSULTANT,
    task_class: "reasoning",
    instructions:
      "각 제품/라인을 시장 성장률(세로축, 통상 연 10% 기준 고/저)과 상대 시장점유율(가로축 = 우리 점유율 ÷ 최대 경쟁사 점유율)로 Star·Cash Cow·Question Mark·Dog에 배치하고 근거·권고 액션을 제시하라. 항목이 비어 있으면 KB에서 후보를 도출하라.",
    vars: [
      inp("products", "제품·사업 라인", {
        desc: "분류할 제품/라인을 한 줄에 하나씩. 비우면 KB에서 후보를 도출합니다.",
        placeholder: "한 줄에 하나씩",
      }),
      kbv("market", "시장", { desc: "시장 성장률(세로축)을 가늠할 시장." }),
      kbv("competitors", "경쟁사", { desc: "상대 점유율(우리 ÷ 최대 경쟁사) 가늠용." }),
      ...common,
    ],
    output: out({
      products: objs("제품", {
        name: str("제품"),
        category: str("분류(star/cash_cow/question_mark/dog)"),
        rationale: str("근거"),
        action: str("권고 액션"),
      }),
    }),
  }),

  analysis("value_chain", "Value Chain", "가치 사슬 분석", {
    system: CONSULTANT,
    instructions: "주요 활동과 지원 활동을 분해하고 마진 원천·개선 포인트를 도출하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "가치 사슬을 분해할 사업." }),
      kbv("business_model", "비즈니스 모델", {
        desc: "활동·마진 구조를 가늠. 비면 서비스 설명에서 추론.",
      }),
      kbv("market", "시장", { desc: "산업 맥락." }),
      ...common,
    ],
    output: out({
      primary_activities: list("주요 활동"),
      support_activities: list("지원 활동"),
      insights: str("마진 원천 및 개선점"),
    }),
  }),

  analysis("business_model_canvas", "Business Model Canvas", "9블록 비즈니스 모델", {
    system: CONSULTANT,
    task_class: "reasoning",
    instructions: "BMC 9개 블록을 이 사업에 맞게 구체적으로 채워라. 입력값을 각 블록의 출발점으로 삼아라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "BMC로 정리할 사업." }),
      kbv("target", "타겟 고객", { desc: "고객 세그먼트 블록의 근거." }),
      kbv("usp", "가치 제안(USP)", { desc: "가치 제안 블록의 근거." }),
      kbv("revenue_model", "수익 모델", { desc: "수익원·비용 블록의 근거. 비면 추론." }),
      ...common,
    ],
    output: out({
      key_partners: list("핵심 파트너", 2),
      key_activities: list("핵심 활동", 2),
      key_resources: list("핵심 자원", 2),
      value_propositions: list("가치 제안", 2),
      customer_relationships: list("고객 관계", 1),
      channels: list("채널", 1),
      customer_segments: list("고객 세그먼트", 1),
      cost_structure: list("비용 구조", 2),
      revenue_streams: list("수익원", 1),
    }),
  }),

  analysis("lean_canvas", "Lean Canvas", "린 캔버스", {
    system: CONSULTANT,
    task_class: "reasoning",
    instructions:
      "Lean Canvas 9블록을 작성하라. 문제·기존 대안·고유가치제안·불공정우위를 특히 날카롭게.",
    vars: [
      kbv("problem", "문제", { desc: "상단 문제 블록의 근거." }),
      kbv("solution", "솔루션", { desc: "솔루션 블록의 근거." }),
      kbv("target", "타겟 고객", { desc: "고객 세그먼트 블록." }),
      kbv("competitors", "기존 대안", {
        desc: "고객이 지금 쓰는 대안(Existing Alternatives). 쉼표·줄로 구분.",
      }),
      kbv("usp", "고유 가치 제안", { desc: "UVP 블록의 출발점. 비면 도출." }),
      ...common,
    ],
    output: out({
      problem: list("문제", 2),
      solution: list("솔루션", 2),
      key_metrics: list("핵심 지표", 2),
      unique_value_proposition: str("고유 가치 제안"),
      unfair_advantage: str("불공정 우위"),
      channels: list("채널", 1),
      customer_segments: list("고객 세그먼트", 1),
      cost_structure: list("비용 구조", 1),
      revenue_streams: list("수익원", 1),
    }),
  }),

  analysis("stp", "STP 분석", "세분화·타겟팅·포지셔닝", {
    system: CONSULTANT,
    instructions: "시장을 세분화하고 우선 타겟을 선정한 뒤 포지셔닝 문장을 도출하라.",
    vars: [
      kbv("market", "시장", { desc: "세분화(S)할 전체 시장." }),
      kbv("target", "타겟 고객", { desc: "타겟팅(T)의 출발 후보." }),
      kbv("competitors", "경쟁사", { desc: "포지셔닝(P) 대비 기준." }),
      kbv("usp", "차별점", { desc: "포지셔닝 문장의 근거. 비면 도출." }),
      ...common,
    ],
    output: out({
      segmentation: objs("세그먼트", { name: str("세그먼트"), description: str("설명") }),
      targeting: str("핵심 타겟과 선정 이유"),
      positioning: str("포지셔닝 문장"),
    }),
  }),

  analysis("three_c", "3C 분석", "Company·Customer·Competitor", {
    system: CONSULTANT,
    instructions: "자사·고객·경쟁사 관점을 각각 분석하고 전략적 시사점을 도출하라.",
    vars: [
      kbv("service_description", "자사(Company)", { desc: "자사 분석 대상." }),
      kbv("usp", "차별점·강점", { desc: "자사(Company) 분석 보강. 비면 추론." }),
      kbv("target", "고객(Customer)", { desc: "Customer 축." }),
      kbv("competitors", "경쟁사(Competitor)", { desc: "Competitor 축. 쉼표·줄로 구분." }),
      ...common,
    ],
    output: out({
      company: list("자사"),
      customer: list("고객"),
      competitor: list("경쟁사"),
      implication: str("시사점"),
    }),
  }),

  analysis("four_p", "4P 마케팅 믹스", "Product·Price·Place·Promotion", {
    system: CONSULTANT,
    instructions: "제품·가격·유통·촉진 전략을 구체적으로 제시하라.",
    vars: [
      kbv("service_description", "제품(Product)", { desc: "마케팅할 제품/서비스." }),
      kbv("target", "타겟 고객", { desc: "가격·촉진 전략의 대상." }),
      kbv("revenue_model", "가격·수익 모델", { desc: "Price 전략의 근거. 비면 추론." }),
      kbv("market", "시장", { desc: "유통(Place)·촉진(Promotion) 맥락." }),
      ...common,
    ],
    output: out({
      product: str("제품"),
      price: str("가격"),
      place: str("유통"),
      promotion: str("촉진"),
    }),
  }),

  analysis("jtbd", "JTBD", "Jobs To Be Done", {
    system: CONSULTANT,
    instructions:
      "고객이 해결하려는 '일'을 기능적/감정적/사회적으로 도출하고, 기대 결과·불만·이득을 정리하라.",
    vars: [
      kbv("target", "타겟 고객", { desc: "Job의 주체. 누가 그 일을 하려는가." }),
      kbv("problem", "상황·문제", { desc: "고객이 처한 상황과 해결하려는 일." }),
      kbv("service_description", "서비스 설명", { desc: "맥락." }),
      ...common,
    ],
    output: out({
      jobs: objs("Jobs", { job: str("Job"), type: str("유형(기능/감정/사회)"), context: str("맥락") }),
      desired_outcomes: list("기대 결과"),
      pains: list("불만"),
      gains: list("이득"),
    }),
  }),

  analysis("customer_journey", "Customer Journey", "고객 여정 지도", {
    system: CONSULTANT,
    instructions: "인지부터 추천까지 단계별 행동·접점·감정·페인포인트·기회를 매핑하라. 입력한 채널을 접점에 반영하라.",
    vars: [
      kbv("target", "타겟 고객", { desc: "여정의 주인공." }),
      kbv("service_description", "서비스 설명", { desc: "여정 대상 서비스." }),
      inp("channels", "주요 접점·채널", {
        desc: "인지~추천 과정에서 고객이 만나는 채널. (선택)",
        placeholder: "예) 인스타그램, 검색, 앱, 매장",
      }),
      ...common,
    ],
    output: out({
      stages: objs("단계", {
        stage: str("단계"),
        actions: str("행동"),
        touchpoints: str("접점"),
        emotion: str("감정"),
        pain_points: str("페인포인트"),
        opportunities: str("개선 기회"),
      }),
    }),
  }),

  analysis("persona", "Persona", "고객 페르소나", {
    system: CONSULTANT,
    instructions: "대표 페르소나 1명을 구체적으로 정의하라. 리서치 메모가 있으면 적극 반영하고, 가공의 디테일은 현실적으로.",
    vars: [
      kbv("target", "타겟 고객", { desc: "페르소나의 토대." }),
      kbv("market", "시장", { desc: "페르소나가 사는 맥락." }),
      kbv("problem", "핵심 문제", { desc: "페르소나의 불만·동기." }),
      inp("research_notes", "고객 리서치 메모", {
        desc: "인터뷰·관찰 메모가 있으면 더 현실적인 페르소나가 됩니다. (선택)",
        placeholder: "선택 입력",
      }),
      ...common,
    ],
    output: out({
      name: str("이름/한 줄 소개"),
      demographics: str("인구통계"),
      goals: list("목표"),
      frustrations: list("불만"),
      behaviors: list("행동 특성"),
      scenario: str("대표 시나리오"),
    }),
  }),

  analysis("blue_ocean", "Blue Ocean (ERRC)", "제거·감소·증가·창조", {
    system: CONSULTANT,
    task_class: "reasoning",
    instructions:
      "입력한 업계 경쟁 요소(없으면 직접 도출)를 기준으로 ERRC 그리드로 경쟁요소를 재구성하고 새 가치곡선을 제시하라. 제거·감소는 비용을, 증가·창조는 가치를 겨냥하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "새 가치 곡선을 그릴 사업." }),
      kbv("competitors", "경쟁사", { desc: "비교할 산업 표준(레드오션). 쉼표·줄로 구분." }),
      inp("industry_factors", "업계 경쟁 요소", {
        desc: "업계가 통상 경쟁하는 요소들. 비우면 AI가 도출. (선택)",
        placeholder: "예) 가격, 매장 수, 메뉴 다양성, 대기시간",
      }),
      ...common,
    ],
    output: out({
      eliminate: list("제거"),
      reduce: list("감소"),
      raise: list("증가"),
      create: list("창조"),
      new_value_curve: str("새로운 가치 곡선"),
    }),
  }),

  analysis("kano", "Kano 모델", "기능 만족도 분류", {
    system: CONSULTANT,
    instructions:
      "입력한 기능(없으면 KB에서 후보 도출)을 타겟 고객 기준으로 기본(must-be)/성능(performance)/감동(delighter)/무관심으로 분류하고 근거를 제시하라.",
    vars: [
      inp("features", "평가할 기능", {
        desc: "분류할 기능을 한 줄에 하나씩. 비우면 KB에서 후보를 도출합니다.",
        placeholder: "한 줄에 하나씩",
      }),
      kbv("target", "타겟 고객", { desc: "누구의 만족도 기준인지." }),
      ...common,
    ],
    output: out({
      features: objs("기능", {
        feature: str("기능"),
        category: str("분류(기본/성능/감동/무관심)"),
        rationale: str("근거"),
      }),
    }),
  }),

  analysis("aarrr", "AARRR", "해적 지표 그로스 프레임", {
    system: CONSULTANT,
    instructions:
      "획득·활성화·유지·수익·추천 각 단계의 핵심 지표와 실행 전술을 제시하라. 수익 지표는 비즈니스 모델(ARPU·MRR 등)에 맞춰라. 입력한 현재 지표가 있으면 개선 관점으로 활용하라.",
    vars: [
      kbv("service_description", "서비스 설명", { desc: "그로스 퍼널을 볼 서비스." }),
      kbv("business_model", "비즈니스 모델", {
        desc: "수익(Revenue) 단계 지표의 맥락. 비면 추론.",
      }),
      kbv("target", "타겟 고객", { desc: "퍼널을 통과하는 사용자." }),
      inp("current_metrics", "현재 지표", {
        desc: "알고 있는 지표가 있으면(가입수·전환율·리텐션 등). (선택)",
        placeholder: "선택 입력",
      }),
      ...common,
    ],
    output: out({
      acquisition: obj("획득", { metric: str("지표"), tactics: list("전술", 1) }),
      activation: obj("활성화", { metric: str("지표"), tactics: list("전술", 1) }),
      retention: obj("유지", { metric: str("지표"), tactics: list("전술", 1) }),
      revenue: obj("수익", { metric: str("지표"), tactics: list("전술", 1) }),
      referral: obj("추천", { metric: str("지표"), tactics: list("전술", 1) }),
    }),
  }),

  analysis("rice", "RICE 우선순위", "Reach·Impact·Confidence·Effort", {
    system: CONSULTANT,
    instructions:
      "입력한 항목(없으면 KB 기반 후보)을 RICE로 점수화하라. Reach=기간 내 영향받는 사용자 수, Impact=3/2/1/0.5/0.25 중 택1(대규모~미미), Confidence=100/80/50%, Effort=person-month. score=R×I×C÷E로 계산해 내림차순 정렬하라.",
    vars: [
      inp("items", "우선순위 매길 항목", {
        desc: "기능·과제를 한 줄에 하나씩. 비우면 KB에서 후보를 도출합니다.",
        placeholder: "한 줄에 하나씩",
      }),
      inp("goal", "목표 지표", {
        desc: "무엇을 키우려는지(예: 유료 전환). Reach·Impact 판단 기준. (선택)",
        placeholder: "예) 30일 리텐션",
      }),
      kbv("service_description", "서비스 설명", { desc: "맥락." }),
      ...common,
    ],
    output: out({
      items: objs("항목", {
        item: str("항목"),
        reach: num("Reach"),
        impact: num("Impact"),
        confidence: num("Confidence"),
        effort: num("Effort"),
        score: num("RICE 점수"),
        note: str("메모"),
      }),
    }),
  }),

  analysis("ice", "ICE 우선순위", "Impact·Confidence·Ease", {
    system: CONSULTANT,
    instructions:
      "입력한 항목(없으면 KB 기반 후보)을 ICE로 점수화하라. Impact·Confidence·Ease 각 1~10, score=(I+C+E)÷3로 계산해 내림차순 정렬하라.",
    vars: [
      inp("items", "평가할 항목", {
        desc: "아이디어·기능을 한 줄에 하나씩. 비우면 KB에서 후보를 도출합니다.",
        placeholder: "한 줄에 하나씩",
      }),
      kbv("service_description", "서비스 설명", { desc: "맥락." }),
      ...common,
    ],
    output: out({
      items: objs("항목", {
        item: str("항목"),
        impact: num("Impact"),
        confidence: num("Confidence"),
        ease: num("Ease"),
        score: num("ICE 점수"),
      }),
    }),
  }),

  analysis("moscow", "MoSCoW", "요구사항 우선순위", {
    system: CONSULTANT,
    instructions:
      "입력한 요구사항(없으면 KB 기반 후보)을 입력한 범위·제약을 고려해 Must/Should/Could/Won't로 분류하라.",
    vars: [
      inp("requirements", "요구사항·기능", {
        desc: "분류할 요구사항을 한 줄에 하나씩. 비우면 KB에서 후보를 도출합니다.",
        placeholder: "한 줄에 하나씩",
      }),
      inp("constraint", "범위·제약", {
        desc: "MVP 범위나 마감 등 분류 기준. (선택)",
        placeholder: "예) 8주 내 출시, 개발자 2명",
      }),
      kbv("service_description", "서비스 설명", { desc: "맥락." }),
      ...common,
    ],
    output: out({
      must: list("Must"),
      should: list("Should"),
      could: list("Could"),
      wont: list("Won't"),
    }),
  }),

  analysis("seven_s", "맥킨지 7S", "조직 7요소 정합성 진단", {
    system: CONSULTANT,
    task_class: "reasoning",
    instructions:
      "맥킨지 7S로 조직을 진단하라. 공유 가치(Shared Values)를 중심에 두고 하드 S(전략·구조·시스템)와 소프트 S(스타일·구성원·역량)를 각각 이 조직에 맞게 2~3문장으로 구체적으로 기술하라. 마지막에 요소 간 정합성(align)과 불일치(misalign)를 짚고 가장 시급한 보완점을 제시하라. 입력한 팀 구성·전략 목표가 있으면 구조·구성원·전략 진단에 반영하라.",
    vars: [
      kbv("service_description", "조직·사업 설명", {
        desc: "7S로 진단할 조직/사업. 모든 요소 진단의 기준입니다.",
      }),
      kbv("business_model", "비즈니스 모델", {
        desc: "전략·시스템·수익 구조의 맥락. 비면 서비스 설명에서 추론.",
      }),
      inp("team", "팀 구성·규모", {
        desc: "구성원(Staff)·구조(Structure) 진단용. 인원·역할·조직 형태. (선택)",
        placeholder: "예) 5명 · 개발 3 · 기획 1 · 마케팅 1",
      }),
      inp("goal", "전략 목표·현재 단계", {
        desc: "전략(Strategy) 진단 기준. 현재 단계와 목표. (선택)",
        placeholder: "예) 시드 단계, 6개월 내 PMF 검증",
      }),
      ...common,
    ],
    output: out({
      shared_values: str("공유 가치 (Shared Values)"),
      strategy: str("전략 (Strategy)"),
      structure: str("구조 (Structure)"),
      systems: str("시스템 (Systems)"),
      style: str("스타일 (Style)"),
      staff: str("구성원 (Staff)"),
      skills: str("역량 (Skills)"),
      alignment: str("7S 정합성 진단"),
    }),
  }),
];
