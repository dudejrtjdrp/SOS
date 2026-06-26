/**
 * 문서함 templates. Each note type carries a small set of structured fields so a
 * meeting minute, idea note, etc. opens with exactly the prompts that kind of
 * document needs — instead of a blank page. Pure data (React-free): the editor
 * reads `fields` to render inputs and stores their values in `notes.fields`
 * (jsonb) keyed by `field.key`. The free `body_md` is always available too.
 *
 * `icon` is a lucide icon name resolved by the UI (see note-icon map). To add a
 * type: append a NoteTypeDef here — no migration (note_type is a free text col).
 */

export type NoteFieldType = "text" | "textarea" | "list" | "date";

export interface NoteField {
  key: string;
  label: string;
  type: NoteFieldType;
  placeholder?: string;
}

export interface NoteTypeDef {
  key: string;
  name: string;
  icon: string;
  tagline: string;
  fields: NoteField[];
}

export const NOTE_TYPES: NoteTypeDef[] = [
  {
    key: "meeting",
    name: "회의록",
    icon: "Users",
    tagline: "안건·논의·결정·할 일을 한 곳에",
    fields: [
      { key: "date", label: "회의 일시", type: "date" },
      { key: "attendees", label: "참석자", type: "list", placeholder: "한 줄에 한 명씩" },
      { key: "agenda", label: "안건", type: "textarea", placeholder: "다룰 주제" },
      { key: "discussion", label: "논의 내용", type: "textarea", placeholder: "오간 이야기 요약" },
      { key: "decisions", label: "결정 사항", type: "textarea", placeholder: "최종 결정" },
      { key: "action_items", label: "액션 아이템", type: "list", placeholder: "담당자 · 할 일 · 기한" },
    ],
  },
  {
    key: "idea",
    name: "아이디어 노트",
    icon: "Lightbulb",
    tagline: "떠오른 아이디어를 검증 가능한 형태로",
    fields: [
      { key: "summary", label: "한 줄 요약", type: "text", placeholder: "이 아이디어를 한 문장으로" },
      { key: "problem", label: "배경·문제", type: "textarea", placeholder: "어떤 문제에서 출발했나" },
      { key: "idea", label: "아이디어", type: "textarea", placeholder: "해결 방식" },
      { key: "target", label: "타깃", type: "text", placeholder: "누구를 위한 것인가" },
      { key: "value", label: "기대 효과", type: "textarea", placeholder: "어떤 가치가 생기나" },
      { key: "risks", label: "리스크·가설", type: "textarea", placeholder: "확인이 필요한 가정" },
      { key: "next", label: "다음 액션", type: "list", placeholder: "한 줄에 하나씩" },
    ],
  },
  {
    key: "research",
    name: "리서치 메모",
    icon: "Telescope",
    tagline: "찾은 자료와 시사점을 정리",
    fields: [
      { key: "topic", label: "주제", type: "text", placeholder: "무엇을 조사했나" },
      { key: "sources", label: "출처·링크", type: "list", placeholder: "한 줄에 하나씩 (URL 가능)" },
      { key: "findings", label: "핵심 발견", type: "textarea", placeholder: "알게 된 사실" },
      { key: "insight", label: "시사점", type: "textarea", placeholder: "우리 프로젝트에 주는 의미" },
      { key: "todo", label: "추가 조사", type: "list", placeholder: "더 파볼 것" },
    ],
  },
  {
    key: "interview",
    name: "인터뷰 기록",
    icon: "MessagesSquare",
    tagline: "고객·전문가 인터뷰 원문과 인사이트",
    fields: [
      { key: "interviewee", label: "대상자", type: "text", placeholder: "이름 / 역할 / 세그먼트" },
      { key: "date", label: "일시", type: "date" },
      { key: "context", label: "배경", type: "textarea", placeholder: "어떤 맥락의 인터뷰인가" },
      { key: "qa", label: "질문·답변", type: "textarea", placeholder: "Q/A 흐름" },
      { key: "quotes", label: "핵심 인용", type: "textarea", placeholder: "그대로 옮길 만한 말" },
      { key: "insight", label: "인사이트", type: "textarea", placeholder: "도출한 시사점" },
    ],
  },
  {
    key: "decision",
    name: "의사결정 기록",
    icon: "GitBranch",
    tagline: "왜 그렇게 정했는지 남기는 ADR",
    fields: [
      { key: "decision", label: "결정 사항", type: "textarea", placeholder: "무엇을 정했나" },
      { key: "context", label: "맥락", type: "textarea", placeholder: "어떤 상황·제약에서" },
      { key: "options", label: "검토한 대안", type: "textarea", placeholder: "비교한 선택지들" },
      { key: "rationale", label: "근거", type: "textarea", placeholder: "이 안을 택한 이유" },
      { key: "consequences", label: "영향·리스크", type: "textarea", placeholder: "이 결정의 파급효과" },
      { key: "revisit", label: "재검토 시점", type: "text", placeholder: "언제 다시 볼지" },
    ],
  },
  {
    key: "retro",
    name: "회고",
    icon: "RefreshCw",
    tagline: "Keep · Problem · Try로 돌아보기",
    fields: [
      { key: "period", label: "기간", type: "text", placeholder: "예: 6월 2주차 스프린트" },
      { key: "keep", label: "좋았던 점 (Keep)", type: "textarea", placeholder: "계속 이어갈 것" },
      { key: "problem", label: "아쉬운 점 (Problem)", type: "textarea", placeholder: "문제였던 것" },
      { key: "try", label: "개선 (Try)", type: "textarea", placeholder: "다음에 시도할 것" },
    ],
  },
  {
    key: "free",
    name: "자유 노트",
    icon: "FileText",
    tagline: "형식 없이 자유롭게",
    fields: [],
  },
];

export const NOTE_TYPE_MAP: Record<string, NoteTypeDef> = Object.fromEntries(
  NOTE_TYPES.map((t) => [t.key, t]),
);

export function getNoteType(key: string | null | undefined): NoteTypeDef {
  return (key && NOTE_TYPE_MAP[key]) || NOTE_TYPE_MAP.free;
}
