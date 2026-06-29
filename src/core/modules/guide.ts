/**
 * Plain-language usage guide for each system module (framework/tool).
 *
 * Goal: a teammate who has never heard of "PESTEL" or "JTBD" should be able to
 * tell, in one glance, *what the tool is for*, *when to reach for it*, *what
 * they'll get back*, and *which inputs it needs* — without reading the prompt.
 *
 * This is a static catalog keyed by the module `key` (stable). It is consumed
 * directly by the UI (browse cards + run screen), so it needs NO DB migration
 * or reseed. Keep this file React-free — strings only.
 */

export interface ModuleGuide {
  /** One short phrase: what this tool produces (card subtitle). */
  tagline: string;
  /** When/why to reach for it — written for someone who doesn't know the framework. */
  whenToUse: string;
  /** What you walk away with (concrete output). */
  youGet: string;
  /** Human-readable names of the content inputs it consumes (for "필요 입력" chips). */
  needs: string[];
  /** Optional one-line practical tip. */
  tip?: string;
  /** Optional lucide icon name (resolved by components/app/module-icon). */
  icon?: string;
}

/**
 * Per-input help text, keyed by variable key. Covers the shared Knowledge-Base
 * fields and known manual inputs. Shown as a hint line under each input so a
 * teammate knows what to type. Project KB auto-fills most of these.
 */
export const FIELD_HELP: Record<string, string> = {
  service_description: "우리 서비스가 무엇을 하는지 한두 문장으로. 예) 자영업자를 위한 자동 회계 앱",
  market: "어떤 시장·산업인지. 예) 국내 소상공인 SaaS",
  target: "주요 고객이 누구인지 구체적으로. 예) 직원 5인 이하 카페 사장",
  competitors: "비교할 경쟁사 이름들. 비워 두면 AI가 추정합니다",
  problem: "고객이 겪는 핵심 문제 한 가지",
  solution: "그 문제를 푸는 우리만의 방식",
  topic: "탐색하고 싶은 주제나 문제 영역",
  event_name: "참가할 공모전·해커톤·지원사업 이름. 예) 2026 예비창업패키지",
  event_topic: "행사가 요구하는 주제·분야. 예) AI·데이터 기반 친환경",
  note: "제출 요건·심사 기준·우대 분야 등 참고사항",
};

/** Help text for the shared output settings (appear on every tool). */
export const SETTING_HELP: Record<string, string> = {
  tone: "결과물의 말투를 고릅니다",
  length: "1=핵심만 짧게 · 5=근거까지 자세히",
  language: "결과를 받을 언어",
};

/** Keys that are output *settings*, not content — used to group the run form. */
export const SETTING_KEYS = ["tone", "length", "language"];

export const MODULE_GUIDE: Record<string, ModuleGuide> = {
  // ── Idea Lab ──────────────────────────────────────────────────────
  brainstorm: {
    tagline: "주제에서 아이디어 발산",
    whenToUse: "막막한 주제·영역에서 다양한 출발점이 필요할 때",
    youGet: "서로 다른 각도의 아이디어 8개와, 그중 가장 유망한 1개 선정",
    needs: ["주제", "시장"],
    tip: "주제를 좁게 적을수록 아이디어가 날카로워집니다.",
    icon: "Lightbulb",
  },
  scamper: {
    tagline: "기존 제품을 7가지로 변형",
    whenToUse: "이미 있는 서비스/제품을 비틀어 개선·확장안을 찾을 때",
    youGet: "대체·결합·응용·수정·다른용도·제거·역발상 7가지 변형 아이디어",
    needs: ["서비스 설명"],
    icon: "Shuffle",
  },
  reverse_thinking: {
    tagline: "거꾸로 생각해 해법 찾기",
    whenToUse: "정공법이 막혔을 때, 실패 시나리오를 뒤집어 돌파구를 찾고 싶을 때",
    youGet: "'최악으로 실패하는 법' 목록과, 이를 뒤집어 얻은 개선 아이디어",
    needs: ["서비스 설명"],
    icon: "Repeat",
  },
  random_combination: {
    tagline: "엉뚱한 결합으로 발상",
    whenToUse: "뻔한 아이디어에서 벗어나 신선한 조합이 필요할 때",
    youGet: "무관해 보이는 개념을 강제로 결합한 새 아이디어 5개",
    needs: ["서비스 설명"],
    icon: "Sparkles",
  },
  pain_point: {
    tagline: "고객 고통점 발굴",
    whenToUse: "무엇을 만들지 정하기 전에, 진짜 문제부터 찾고 싶을 때",
    youGet: "반복되는 고통점을 빈도·심각도와 함께, 각 고통점의 기회까지",
    needs: ["타겟", "시장"],
    icon: "Frown",
  },
  event_idea: {
    tagline: "행사에 맞춘 출품 아이디어",
    whenToUse: "공모전·해커톤·지원사업에 무엇을 만들어 낼지 정할 때",
    youGet: "행사 주제에 적합한 프로젝트·서비스 컨셉 5개와, 가장 유망한 출품작 선정",
    needs: ["행사명", "행사 주제"],
    tip: "공고문 페이지의 ‘행사 정보’에서 바로 채워 열면 행사명·주제가 자동 입력됩니다.",
    icon: "Trophy",
  },

  // ── Research ──────────────────────────────────────────────────────
  tam_sam_som: {
    tagline: "시장 규모 3단계 산정",
    whenToUse: "사업계획서·IR에서 '시장이 얼마나 큰지'를 숫자로 보여줘야 할 때",
    youGet: "TAM·SAM·SOM을 top-down·bottom-up 두 방식으로, 가정과 계산까지",
    needs: ["시장", "타겟", "단가", "지역"],
    tip: "타겟을 구체적으로 적을수록 SOM 추정이 현실적이 됩니다.",
    icon: "Calculator",
  },
  competitor_scan: {
    tagline: "경쟁사 비교 분석",
    whenToUse: "누구와 경쟁하는지, 어디서 이길 수 있는지 정리할 때",
    youGet: "경쟁사별 강점·약점·가격·차별점 비교표와 우리의 포지셔닝 기회",
    needs: ["경쟁사", "서비스 설명", "시장", "타겟"],
    icon: "Swords",
  },
  market_size: {
    tagline: "시장 규모·성장률 추정",
    whenToUse: "시장이 충분히 크고 빠르게 자라는지 빠르게 확인할 때",
    youGet: "현재 규모, 성장률(CAGR), 성장 동인과 추정 근거",
    needs: ["서비스 설명", "시장", "지역"],
    icon: "TrendingUp",
  },
  trends: {
    tagline: "관련 트렌드 도출",
    whenToUse: "지금 이 시장에서 무슨 일이 일어나는지, 타이밍이 맞는지 볼 때",
    youGet: "최신 트렌드 5개와, 각각이 우리 사업에 주는 함의",
    needs: ["서비스 설명", "시장", "타겟"],
    icon: "LineChart",
  },
  industry_analysis: {
    tagline: "산업 구조 분석",
    whenToUse: "산업의 판도·주요 플레이어·진입장벽을 통째로 파악할 때",
    youGet: "산업 구조, 핵심 플레이어, 밸류체인, 규제 환경, 진입장벽",
    needs: ["서비스 설명", "시장"],
    icon: "Building2",
  },
  customer_research: {
    tagline: "고객 세그먼트·니즈",
    whenToUse: "고객이 누구이고 무엇을 원하는지 구조화할 때",
    youGet: "핵심 세그먼트별 니즈, 구매 결정 요인, 미충족 니즈",
    needs: ["서비스 설명", "시장", "타겟"],
    icon: "Users",
  },
  interview_questions: {
    tagline: "고객 인터뷰 질문 생성",
    whenToUse: "고객 인터뷰를 앞두고 유도하지 않는 좋은 질문이 필요할 때",
    youGet: "The Mom Test 원칙의 단계별(과거 행동·문제·대안) 인터뷰 질문",
    needs: ["서비스 설명", "타겟", "문제"],
    tip: "인터뷰 직전에 돌려 바로 들고 가세요.",
    icon: "MessagesSquare",
  },
  reddit_analysis: {
    tagline: "Reddit 리서치 가이드",
    whenToUse: "커뮤니티에서 진짜 고객의 말과 불만을 수집하고 싶을 때",
    youGet: "탐색할 서브레딧, 검색어, 수집할 신호(불만·대안·표현) 목록",
    needs: ["서비스 설명", "시장", "타겟"],
    icon: "MessageSquare",
  },
  news_analysis: {
    tagline: "뉴스·동향 모니터링 가이드",
    whenToUse: "시장 이벤트와 흐름을 꾸준히 추적할 기준을 잡을 때",
    youGet: "모니터링 키워드, 주목할 이벤트 유형, 사업 시사점",
    needs: ["서비스 설명", "시장"],
    icon: "Newspaper",
  },

  // ── Validation ────────────────────────────────────────────────────
  problem_validation: {
    tagline: "문제가 진짜인지 검증",
    whenToUse: "만들기 전에 '이 문제가 실재하는지' 확인하고 싶을 때",
    youGet: "검증 가설, 검증 방법, 성공 기준과 중단(반증) 기준",
    needs: ["문제", "타겟", "서비스 설명"],
    icon: "ShieldQuestion",
  },
  solution_validation: {
    tagline: "솔루션이 통하는지 검증",
    whenToUse: "솔루션이 문제를 실제로 푸는지 실험으로 확인할 때",
    youGet: "MVP 실험안, 측정 지표, 기대 결과와 가장 위험한 가정",
    needs: ["문제", "솔루션", "타겟"],
    icon: "FlaskConical",
  },
  pmf_score: {
    tagline: "제품-시장 적합도 점수",
    whenToUse: "지금 아이디어가 얼마나 탄탄한지 한눈에 점수로 보고 싶을 때",
    youGet: "5개 차원 0~10 평가, 총점, 개선 우선순위",
    needs: ["문제", "솔루션", "시장", "경쟁사"],
    tip: "검증을 진행하며 주기적으로 다시 돌려 점수 변화를 추적하세요.",
    icon: "Gauge",
  },
  risk_analysis: {
    tagline: "리스크 도출·완화",
    whenToUse: "무엇이 사업을 망칠 수 있는지 미리 짚고 대비할 때",
    youGet: "시장·기술·실행·재무·규제 리스크와 발생가능성·영향·완화책",
    needs: ["서비스 설명", "솔루션", "시장"],
    icon: "TriangleAlert",
  },

  // ── Analysis ──────────────────────────────────────────────────────
  swot: {
    tagline: "강점·약점·기회·위협",
    whenToUse: "내부 역량과 외부 환경을 한 장으로 정리해 전략 방향을 잡을 때",
    youGet: "S·W·O·T 각 3개 이상과 SO·WT 관점의 전략적 시사점",
    needs: ["서비스 설명", "차별점", "시장", "경쟁사"],
    icon: "Grid2x2",
  },
  pest: {
    tagline: "거시환경 4요인",
    whenToUse: "우리가 통제 못 하는 바깥 환경(정치·경제·사회·기술)을 점검할 때",
    youGet: "정치·경제·사회·기술 요인과 종합 시사점",
    needs: ["서비스 설명", "시장", "지역"],
    icon: "Globe",
  },
  pestel: {
    tagline: "거시환경 6요인",
    whenToUse: "PEST에 환경·법률까지 더해 규제에 민감한 사업을 볼 때",
    youGet: "정치·경제·사회·기술·환경·법률 요인과 종합",
    needs: ["서비스 설명", "시장", "지역"],
    icon: "Scale",
  },
  porter_five: {
    tagline: "산업 매력도 5가지 힘",
    whenToUse: "이 산업이 돈 벌기 좋은 구조인지 따져볼 때",
    youGet: "5가지 힘의 강도·근거와 산업 매력도 종합 평가",
    needs: ["시장", "타겟", "경쟁사", "대체재"],
    icon: "Castle",
  },
  bcg_matrix: {
    tagline: "제품 포트폴리오 분류",
    whenToUse: "여러 제품/라인 중 무엇에 투자하고 무엇을 정리할지 정할 때",
    youGet: "Star·Cash Cow·Question Mark·Dog 분류와 권고 액션",
    needs: ["제품 라인", "시장", "경쟁사"],
    icon: "LayoutGrid",
  },
  value_chain: {
    tagline: "가치 사슬 분해",
    whenToUse: "어디서 가치(마진)가 생기고 개선 여지가 있는지 볼 때",
    youGet: "주요·지원 활동 분해와 마진 원천·개선 포인트",
    needs: ["서비스 설명", "비즈니스 모델", "시장"],
    icon: "Workflow",
  },
  business_model_canvas: {
    tagline: "비즈니스 모델 9블록",
    whenToUse: "사업 전체 그림(고객·가치·수익·비용)을 한 장에 정리할 때",
    youGet: "BMC 9개 블록을 우리 사업에 맞게 채운 캔버스",
    needs: ["서비스 설명", "타겟", "USP", "수익 모델"],
    icon: "LayoutDashboard",
  },
  lean_canvas: {
    tagline: "린 캔버스 9블록",
    whenToUse: "초기 스타트업 관점에서 문제·해법·차별점을 빠르게 정리할 때",
    youGet: "문제·고유가치제안·불공정우위를 중심으로 한 9블록",
    needs: ["문제", "솔루션", "타겟", "기존 대안"],
    tip: "BMC보다 가볍습니다. 아주 초기엔 이쪽을 먼저 쓰세요.",
    icon: "Rocket",
  },
  stp: {
    tagline: "세분화·타겟팅·포지셔닝",
    whenToUse: "누구를 노리고 어떻게 다르게 보일지 정할 때",
    youGet: "시장 세그먼트, 핵심 타겟, 포지셔닝 문장",
    needs: ["시장", "타겟", "경쟁사", "차별점"],
    icon: "Crosshair",
  },
  three_c: {
    tagline: "자사·고객·경쟁사",
    whenToUse: "전략의 3대 축을 균형 있게 빠르게 점검할 때",
    youGet: "자사·고객·경쟁사 분석과 전략적 시사점",
    needs: ["서비스 설명", "타겟", "경쟁사"],
    icon: "Triangle",
  },
  four_p: {
    tagline: "마케팅 믹스 4P",
    whenToUse: "제품을 어떻게 팔지(제품·가격·유통·촉진) 구체화할 때",
    youGet: "제품·가격·유통·촉진 전략",
    needs: ["서비스 설명", "타겟", "수익 모델", "시장"],
    icon: "Tag",
  },
  jtbd: {
    tagline: "고객이 해결하려는 '일'",
    whenToUse: "기능이 아니라 고객이 진짜 이루려는 목적에서 출발할 때",
    youGet: "기능적·감정적·사회적 Job과 기대결과·불만·이득",
    needs: ["타겟", "상황·문제", "서비스 설명"],
    icon: "Target",
  },
  customer_journey: {
    tagline: "고객 여정 지도",
    whenToUse: "인지부터 추천까지 고객 경험의 빈틈을 찾을 때",
    youGet: "단계별 행동·접점·감정·페인포인트·개선 기회",
    needs: ["타겟", "서비스 설명", "채널"],
    icon: "Map",
  },
  persona: {
    tagline: "대표 고객 페르소나",
    whenToUse: "팀이 같은 '한 사람'을 떠올리며 의사결정하고 싶을 때",
    youGet: "인구통계·목표·불만·행동·시나리오를 갖춘 페르소나 1명",
    needs: ["타겟", "시장", "문제"],
    icon: "UserRound",
  },
  blue_ocean: {
    tagline: "ERRC 가치 재구성",
    whenToUse: "경쟁이 치열한 시장에서 경쟁 자체를 무의미하게 만들 길을 찾을 때",
    youGet: "제거·감소·증가·창조 그리드와 새로운 가치 곡선",
    needs: ["서비스 설명", "경쟁사", "업계 경쟁 요소"],
    icon: "Waves",
  },
  kano: {
    tagline: "기능 만족도 분류",
    whenToUse: "어떤 기능이 필수이고 어떤 게 감동을 주는지 가를 때",
    youGet: "기능별 기본·성능·감동·무관심 분류와 근거",
    needs: ["평가할 기능", "타겟"],
    icon: "Star",
  },
  aarrr: {
    tagline: "해적 지표 그로스",
    whenToUse: "획득~추천 깔때기에서 어디가 새는지 지표로 잡을 때",
    youGet: "5단계(획득·활성화·유지·수익·추천)별 핵심 지표와 실행 전술",
    needs: ["서비스 설명", "비즈니스 모델", "타겟"],
    icon: "Filter",
  },
  rice: {
    tagline: "RICE 우선순위 점수",
    whenToUse: "여러 기능/과제의 우선순위를 숫자로 정렬할 때",
    youGet: "Reach·Impact·Confidence·Effort 점수와 RICE 순위",
    needs: ["우선순위 항목", "목표 지표"],
    icon: "ListOrdered",
  },
  ice: {
    tagline: "ICE 우선순위 점수",
    whenToUse: "RICE보다 빠르게 아이디어 우선순위를 매기고 싶을 때",
    youGet: "Impact·Confidence·Ease 점수와 평균 점수",
    needs: ["평가할 항목", "서비스 설명"],
    icon: "Gauge",
  },
  moscow: {
    tagline: "요구사항 우선순위",
    whenToUse: "MVP 범위를 정할 때 무엇을 넣고 뺄지 합의할 때",
    youGet: "Must·Should·Could·Won't 4분류",
    needs: ["요구사항", "범위·제약"],
    icon: "ListChecks",
  },
  seven_s: {
    tagline: "조직 7요소 정합성",
    whenToUse: "전략·조직·문화가 서로 맞물려 돌아가는지 점검할 때",
    youGet: "공유가치 중심 7요소(전략·구조·시스템·스타일·구성원·역량) 진단과 정합성 평가",
    needs: ["서비스 설명", "비즈니스 모델", "팀 구성", "전략 목표"],
    tip: "하드 S(전략·구조·시스템)와 소프트 S(가치·스타일·사람·역량)의 어긋남을 먼저 보세요.",
    icon: "Network",
  },
};

/** Fallback used for custom/unknown modules so the UI never breaks. */
const FALLBACK_GUIDE: ModuleGuide = {
  tagline: "",
  whenToUse: "값을 채우고 실행하면 AI가 결과를 만들어 줍니다.",
  youGet: "구조화된 분석 결과",
  needs: [],
};

/** Look up a module guide by key, with a safe fallback. */
export function getGuide(key: string | null | undefined): ModuleGuide {
  if (!key) return FALLBACK_GUIDE;
  return MODULE_GUIDE[key] ?? FALLBACK_GUIDE;
}

/** Help text for any input (content field or setting), if known. */
export function getFieldHelp(key: string): string | undefined {
  return FIELD_HELP[key] ?? SETTING_HELP[key];
}

// ── Documents ───────────────────────────────────────────────────────
// Documents are built entirely from the Knowledge Base (+ prior analyses via
// RAG), so the most useful guidance is: what it's for, who reads it, what
// sections it produces, and which KB fields it leans on (so the user fills
// those first). `needs` are KB field *keys* (so the UI can show filled/empty).

/** KB field key → short label, for rendering "필요 KB" chips. */
export const KB_FIELD_LABEL: Record<string, string> = {
  project_name: "프로젝트명",
  service_description: "서비스 설명",
  market: "시장",
  target: "타겟",
  problem: "문제",
  solution: "솔루션",
  competitors: "경쟁사",
  business_model: "비즈니스 모델",
  tech_stack: "기술 스택",
  revenue_model: "수익 모델",
  usp: "USP",
};

export interface DocGuide {
  /** One short phrase: what this document is. */
  tagline: string;
  /** When/why to generate it. */
  whenToUse: string;
  /** What you get (structure summary). */
  youGet: string;
  /** Section labels (mirrors the seed's doc_sections, for an at-a-glance 구성). */
  sections: string[];
  /** KB field keys this doc leans on most (for "필요 KB" chips + readiness). */
  needs: string[];
  /** Who reads it. */
  audience?: string;
  /** Lucide icon name (resolved by components/app/module-icon). */
  icon?: string;
}

export const DOC_GUIDE: Record<string, DocGuide> = {
  biz_plan: {
    tagline: "예비·초기창업패키지 사업계획서",
    whenToUse: "예비·초기창업패키지 등 정부 창업지원에 제출할 때",
    youGet: "PSST 구조(문제·실현가능성·성장전략·팀)의 사업계획서 초안",
    sections: ["문제 인식", "실현 가능성", "성장 전략", "팀 구성"],
    needs: ["problem", "solution", "market", "competitors"],
    audience: "정부지원 심사자",
    icon: "Landmark",
  },
  tips: {
    tagline: "TIPS 지원용 사업계획서",
    whenToUse: "TIPS 프로그램(기술창업)에 지원할 때",
    youGet: "기술성·시장성·사업성·팀·사업화 계획",
    sections: ["기술성", "시장성", "사업성", "팀 역량", "사업화 계획"],
    needs: ["tech_stack", "market", "business_model"],
    audience: "TIPS 운영사·심사자",
    icon: "Rocket",
  },
  gov_support: {
    tagline: "범용 정부지원사업 계획서",
    whenToUse: "일반 정부지원사업 양식이 필요할 때",
    youGet: "배경·내용·시장·예산·기대효과",
    sections: ["추진 배경·필요성", "사업 내용", "시장·사업화", "예산·일정", "기대 효과"],
    needs: ["problem", "market", "solution"],
    audience: "정부지원 심사자",
    icon: "Landmark",
  },
  investment_deck: {
    tagline: "시드~프리A 투자 피칭 덱",
    whenToUse: "투자자에게 피칭할 덱이 필요할 때",
    youGet: "Problem부터 Ask까지 9장 흐름",
    sections: [
      "Problem",
      "Solution",
      "Market",
      "Product",
      "Business Model",
      "Traction",
      "Competition",
      "Team",
      "Ask",
    ],
    needs: ["problem", "solution", "market", "competitors", "business_model"],
    audience: "초기 투자자(VC·엔젤)",
    icon: "Presentation",
  },
  ir_deck: {
    tagline: "투자자 IR 발표자료",
    whenToUse: "본격 IR·후속 라운드 발표가 필요할 때",
    youGet: "요약부터 투자요청까지 10장 구성",
    sections: [
      "Executive Summary",
      "Problem·Solution",
      "Market",
      "Product",
      "Go-To-Market",
      "Business Model",
      "Traction",
      "Financials",
      "Team",
      "Ask",
    ],
    needs: ["market", "business_model", "revenue_model"],
    audience: "투자자",
    icon: "TrendingUp",
  },
  hackathon: {
    tagline: "해커톤 피칭 자료",
    whenToUse: "해커톤 발표를 빠르게 준비할 때",
    youGet: "문제·솔루션·데모·임팩트 4장",
    sections: ["문제", "솔루션", "데모", "임팩트·확장"],
    needs: ["problem", "solution", "tech_stack"],
    audience: "해커톤 심사자",
    icon: "Trophy",
  },
  contest: {
    tagline: "창업·아이디어 공모전 기획서",
    whenToUse: "공모전 제출 기획서가 필요할 때",
    youGet: "배경·아이디어·실현가능성·기대효과",
    sections: ["배경·목적", "아이디어 개요", "실현 가능성", "기대 효과"],
    needs: ["problem", "solution", "usp"],
    audience: "공모전 심사자",
    icon: "Award",
  },
  one_pager: {
    tagline: "한 장 요약 브리프",
    whenToUse: "메일·소개용으로 한 장에 핵심만 담을 때",
    youGet: "개요·문제솔루션·시장·모델팀 1장",
    sections: ["개요", "문제·솔루션", "시장", "모델·팀"],
    needs: ["service_description", "market", "revenue_model"],
    audience: "투자자·파트너",
    icon: "FileText",
  },
  executive_summary: {
    tagline: "사업 요약문",
    whenToUse: "제안서·지원서 맨 앞 요약이 필요할 때",
    youGet: "사업 전체를 1페이지로 압축",
    sections: ["요약"],
    needs: ["service_description", "problem", "market"],
    audience: "심사자·투자자",
    icon: "ScrollText",
  },
  pitch_script: {
    tagline: "60초·3분 피치 대본",
    whenToUse: "엘리베이터 피치·짧은 발표 대본이 필요할 때",
    youGet: "Hook·Body·Close 대본",
    sections: ["Hook", "Body", "Close"],
    needs: ["problem", "solution", "usp"],
    audience: "투자자·심사자",
    icon: "Mic",
  },
  presentation_script: {
    tagline: "데모데이 발표 스크립트",
    whenToUse: "슬라이드에 맞춘 발표 멘트가 필요할 때",
    youGet: "오프닝·본문·예상 Q&A",
    sections: ["오프닝", "본문", "예상 Q&A"],
    needs: ["service_description", "solution"],
    audience: "데모데이 청중·심사자",
    icon: "Megaphone",
  },
  mvp_plan: {
    tagline: "MVP 기획서",
    whenToUse: "무엇을 최소로 만들지 정할 때",
    youGet: "목표 가설·기능 범위·지표·실행 계획",
    sections: ["목표 가설", "핵심 기능 범위", "성공 지표", "실행 계획"],
    needs: ["problem", "solution", "target"],
    audience: "팀 내부",
    icon: "ClipboardList",
  },
  prd: {
    tagline: "제품 요구사항 문서(PRD)",
    whenToUse: "개발 착수 전 요구사항을 정리할 때",
    youGet: "개요·사용자·요구사항·지표·리스크",
    sections: ["개요·배경", "사용자·시나리오", "요구사항", "성공 지표", "리스크"],
    needs: ["target", "problem", "solution"],
    audience: "개발·디자인 팀",
    icon: "ClipboardList",
  },
  service_plan: {
    tagline: "서비스 기획서",
    whenToUse: "서비스 전체 그림을 문서로 정리할 때",
    youGet: "컨셉·페르소나·여정·기능·모델·로드맵",
    sections: ["서비스 컨셉", "타겟·페르소나", "사용자 여정", "기능 정의", "비즈니스 모델", "로드맵"],
    needs: ["service_description", "target", "business_model"],
    audience: "팀·이해관계자",
    icon: "Map",
  },
};

const FALLBACK_DOC: DocGuide = {
  tagline: "",
  whenToUse: "Knowledge Base를 바탕으로 문서를 생성합니다.",
  youGet: "",
  sections: [],
  needs: [],
};

export function getDocGuide(key: string | null | undefined): DocGuide {
  if (!key) return FALLBACK_DOC;
  return DOC_GUIDE[key] ?? FALLBACK_DOC;
}

/** Short display names for documents (for "쓰이는 문서" chips on the KB screen). */
export const DOC_NAME: Record<string, string> = {
  biz_plan: "사업계획서",
  tips: "TIPS 계획서",
  gov_support: "정부지원 계획서",
  investment_deck: "투자 Deck",
  ir_deck: "IR Deck",
  hackathon: "해커톤",
  contest: "공모전",
  one_pager: "One Pager",
  executive_summary: "Executive Summary",
  pitch_script: "피치 대본",
  presentation_script: "발표 대본",
  mvp_plan: "MVP 기획서",
  prd: "PRD",
  service_plan: "서비스 기획서",
};

/** Which documents consume a given Knowledge Base field — derived from
 *  DOC_GUIDE.needs so the KB screen can show users why a field matters. */
export function docsUsingKBField(kbKey: string): string[] {
  const out: string[] = [];
  for (const [docKey, g] of Object.entries(DOC_GUIDE)) {
    if (g.needs.includes(kbKey)) out.push(DOC_NAME[docKey] ?? docKey);
  }
  return out;
}
