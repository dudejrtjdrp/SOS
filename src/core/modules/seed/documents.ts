import type { SeedModule, DocSection } from "../types";
import { doc } from "../helpers";

const s = (key: string, title: string, instruction: string, module_key?: string): DocSection => ({
  key,
  title,
  instruction,
  module_key,
});

export const documentModules: SeedModule[] = [
  doc(
    "biz_plan",
    "창업패키지 사업계획서",
    "예비/초기창업패키지 PSST 구조",
    [
      s("problem", "1. 문제 인식 (Problem)", "창업 아이템의 배경·필요성·목적과 해결하려는 문제를 시장 관점에서 서술."),
      s("solution", "2. 실현 가능성 (Solution)", "솔루션의 구체화 방안·개발 현황·경쟁사 대비 차별성을 서술.", "swot"),
      s("scaleup", "3. 성장 전략 (Scale-up)", "목표시장·진입전략·매출 창출 방안과 자금 소요·조달 계획을 서술.", "tam_sam_som"),
      s("team", "4. 팀 구성 (Team)", "대표·팀원의 역량과 보유 자원, 외부 협력 체계를 서술."),
    ],
    "government",
  ),

  doc(
    "tips",
    "TIPS 사업계획서",
    "TIPS 프로그램 지원용",
    [
      s("tech", "기술성", "핵심 기술의 독창성·진입장벽·개발 역량을 서술."),
      s("market", "시장성", "목표시장 규모와 성장성, 사업화 가능성을 서술.", "tam_sam_som"),
      s("business", "사업성", "비즈니스 모델과 수익화 전략을 서술.", "business_model_canvas"),
      s("team", "팀 역량", "팀의 기술·실행 역량과 추천 운영사 연계를 서술."),
      s("plan", "사업화 계획", "단계별 마일스톤과 자금 활용 계획을 서술."),
    ],
    "tips",
  ),

  doc(
    "gov_support",
    "정부지원사업 계획서",
    "범용 정부지원사업 양식",
    [
      s("necessity", "추진 배경 및 필요성", "지원사업 목적에 부합하는 문제와 필요성을 서술."),
      s("content", "사업 내용", "수행할 사업의 구체적 내용과 추진 방법을 서술."),
      s("market", "시장 및 사업화", "목표시장과 사업화 전략을 서술.", "tam_sam_som"),
      s("budget", "예산 및 추진 일정", "예산 항목과 단계별 일정을 서술."),
      s("expected", "기대 효과", "정량·정성 기대 효과를 서술."),
    ],
    "government",
  ),

  doc(
    "investment_deck",
    "투자용 Deck",
    "시드~프리A 투자 피칭",
    [
      s("problem", "Problem", "고객의 절실한 문제를 임팩트 있게."),
      s("solution", "Solution", "솔루션과 작동 방식."),
      s("market", "Market", "TAM-SAM-SOM과 성장성.", "tam_sam_som"),
      s("product", "Product", "핵심 기능과 데모 포인트."),
      s("business_model", "Business Model", "수익 구조.", "business_model_canvas"),
      s("traction", "Traction", "지표·성장·마일스톤."),
      s("competition", "Competition", "경쟁 구도와 차별점.", "competitor_scan"),
      s("team", "Team", "팀이 이 문제를 풀 자격."),
      s("ask", "Ask", "투자 규모와 사용처."),
    ],
    "investment",
  ),

  doc(
    "ir_deck",
    "IR Deck",
    "투자자 IR 발표자료",
    [
      s("summary", "Executive Summary", "한 장 요약."),
      s("problem", "Problem & Solution", "문제와 해법."),
      s("market", "Market Opportunity", "시장 기회.", "tam_sam_som"),
      s("product", "Product", "제품 개요."),
      s("gtm", "Go-To-Market", "시장 진입 전략.", "stp"),
      s("model", "Business Model", "수익 모델.", "business_model_canvas"),
      s("traction", "Traction & Metrics", "성과 지표.", "aarrr"),
      s("financials", "Financials", "재무 전망과 가정."),
      s("team", "Team", "팀과 자문."),
      s("ask", "Investment Ask", "라운드와 사용처."),
    ],
    "investment",
  ),

  doc(
    "hackathon",
    "해커톤 발표자료",
    "해커톤 피칭",
    [
      s("problem", "문제", "해결하려는 문제."),
      s("solution", "솔루션", "우리가 만든 것."),
      s("demo", "데모", "핵심 데모 흐름과 기술 스택."),
      s("impact", "임팩트 & 확장", "임팩트와 향후 확장."),
    ],
    "hackathon",
  ),

  doc(
    "contest",
    "공모전 기획서",
    "창업/아이디어 공모전",
    [
      s("background", "배경 및 목적", "주제 적합성과 동기."),
      s("idea", "아이디어 개요", "핵심 아이디어와 차별점."),
      s("feasibility", "실현 가능성", "구현 방안과 실행 계획.", "swot"),
      s("effect", "기대 효과", "사회·경제적 효과."),
    ],
    "contest",
  ),

  doc("one_pager", "One Page Brief", "한 장 요약 브리프", [
    s("overview", "개요", "서비스 한 줄 정의와 핵심 가치."),
    s("problem_solution", "문제·솔루션", "문제와 해법 요약."),
    s("market", "시장", "목표시장과 규모.", "tam_sam_som"),
    s("model_team", "모델·팀", "수익 모델과 팀 요약."),
  ]),

  doc("executive_summary", "Executive Summary", "사업 요약문", [
    s("summary", "요약", "사업 전체를 1페이지로 압축. 문제·솔루션·시장·모델·팀·요청을 포함."),
  ]),

  doc("pitch_script", "Pitch Script", "60초/3분 피치 대본", [
    s("hook", "Hook", "첫 15초 강력한 후킹."),
    s("body", "Body", "문제→솔루션→시장→차별점→트랙션 흐름의 대본."),
    s("close", "Close", "요청과 마무리 한 문장."),
  ]),

  doc("presentation_script", "발표 대본", "데모데이 발표 스크립트", [
    s("intro", "오프닝", "자기소개와 한 줄 소개."),
    s("flow", "본문", "슬라이드 순서에 맞춘 발표 대본."),
    s("qna", "예상 Q&A", "심사위원 예상 질문과 답변."),
  ]),

  doc("mvp_plan", "MVP 기획서", "최소기능제품 기획", [
    s("goal", "목표 가설", "MVP로 검증할 핵심 가설."),
    s("scope", "핵심 기능 범위", "포함/제외 기능.", "moscow"),
    s("metrics", "성공 지표", "측정할 지표와 기준."),
    s("plan", "실행 계획", "일정과 리소스."),
  ]),

  doc("prd", "PRD", "제품 요구사항 문서", [
    s("overview", "개요·배경", "문제·목표·비목표."),
    s("users", "사용자·시나리오", "타겟 사용자와 주요 시나리오.", "persona"),
    s("requirements", "요구사항", "기능 요구사항과 우선순위.", "moscow"),
    s("metrics", "성공 지표", "성공 기준과 측정 방법."),
    s("risks", "리스크·고려사항", "리스크와 의존성.", "risk_analysis"),
  ]),

  doc("service_plan", "서비스 기획서", "서비스 전체 기획", [
    s("concept", "서비스 컨셉", "비전과 핵심 가치."),
    s("target", "타겟·페르소나", "핵심 사용자.", "persona"),
    s("journey", "사용자 여정", "주요 플로우.", "customer_journey"),
    s("features", "기능 정의", "핵심 기능과 우선순위.", "moscow"),
    s("model", "비즈니스 모델", "수익 구조.", "business_model_canvas"),
    s("roadmap", "로드맵", "단계별 출시 계획."),
  ]),
];
