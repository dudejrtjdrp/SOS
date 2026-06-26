/**
 * 공고문 (announcement / call-for-proposal) metadata — pure, React-free.
 * Status workflow + a deadline D-day calculation shared by the UI.
 */

export type NoticeStatus = "open" | "preparing" | "submitted" | "closed";
export type NoticeKind = "file" | "image" | "link";

export const NOTICE_STATUS: { key: NoticeStatus; label: string; tone: string }[] = [
  { key: "open", label: "확인 필요", tone: "muted" },
  { key: "preparing", label: "준비 중", tone: "primary" },
  { key: "submitted", label: "제출 완료", tone: "success" },
  { key: "closed", label: "마감/보류", tone: "border" },
];

export const NOTICE_STATUS_MAP: Record<string, { label: string; tone: string }> =
  Object.fromEntries(NOTICE_STATUS.map((s) => [s.key, { label: s.label, tone: s.tone }]));

export function statusLabel(status: string | null | undefined): string {
  return (status && NOTICE_STATUS_MAP[status]?.label) || "확인 필요";
}

/**
 * Days until a deadline (date string 'YYYY-MM-DD'), comparing calendar days in
 * local time. Returns null if no/invalid deadline. 0 = due today, negative =
 * past due. `today` is injectable for testing.
 */
export function dDay(deadline: string | null | undefined, today: Date = new Date()): number | null {
  if (!deadline) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(deadline);
  if (!m) return null;
  const due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - t0.getTime()) / 86400000);
}

/** Human D-day label: 'D-3', 'D-DAY', 'D+2' (past due). */
export function dDayLabel(deadline: string | null | undefined, today: Date = new Date()): string | null {
  const d = dDay(deadline, today);
  if (d == null) return null;
  if (d === 0) return "D-DAY";
  return d > 0 ? `D-${d}` : `D+${-d}`;
}
