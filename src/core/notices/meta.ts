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

// ── In-app preview classification ─────────────────────────────────
/**
 * How a 공고문 attachment can be previewed in the browser:
 *   image  — <img> lightbox
 *   pdf    — native <iframe> render
 *   office — MS Office Online viewer embed (doc/docx/ppt/pptx/xls/xlsx)
 *   hwp    — 한글 5.x binary, rendered in-app by hwp.js
 *   hwpx   — 한글 신형(OWPML zip), rendered in-app by @ssabrojs/hwpxjs
 *   none   — links / unknown types → open or download
 */
export type PreviewKind = "image" | "pdf" | "office" | "hwp" | "hwpx" | "none";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"]);
const OFFICE_EXTS = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"]);

/** Lowercased file extension without the dot, or "" if none. */
export function fileExt(fileName: string | null | undefined): string {
  if (!fileName) return "";
  const clean = fileName.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  return dot > -1 ? clean.slice(dot + 1).toLowerCase() : "";
}

/** Classify an attachment by kind + mime + filename. Pure / React-free. */
export function previewKind(input: {
  kind?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}): PreviewKind {
  if (input.kind === "link") return "none";
  const mime = (input.mimeType ?? "").toLowerCase();
  const e = fileExt(input.fileName);

  if (input.kind === "image" || mime.startsWith("image/") || IMAGE_EXTS.has(e)) return "image";
  if (mime === "application/pdf" || e === "pdf") return "pdf";
  if (e === "hwpx") return "hwpx";
  if (e === "hwp" || mime === "application/x-hwp" || mime === "application/haansofthwp" || mime === "application/vnd.hancom.hwp")
    return "hwp";
  if (
    OFFICE_EXTS.has(e) ||
    mime === "application/msword" ||
    mime.includes("officedocument") ||
    mime.includes("ms-word") ||
    mime.includes("ms-powerpoint") ||
    mime.includes("ms-excel")
  )
    return "office";
  return "none";
}

/** Whether this kind has an in-app viewer (everything except links/unknown). */
export function isPreviewable(k: PreviewKind): boolean {
  return k !== "none";
}

/** Short Korean badge label for a file type, or null when not worth showing. */
export function previewLabel(k: PreviewKind): string | null {
  switch (k) {
    case "image":
      return "이미지";
    case "pdf":
      return "PDF";
    case "office":
      return "독스";
    case "hwp":
    case "hwpx":
      return "한글";
    default:
      return null;
  }
}

/**
 * Microsoft Office Online viewer embed URL. `fileUrl` must be reachable from the
 * public internet (a presigned R2 GET URL works) since Microsoft fetches it
 * server-side.
 */
export function officeEmbedUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}
