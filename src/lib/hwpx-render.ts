/**
 * Unified 한글(.hwp / .hwpx) → HTML renderer + .hwpx writer, built on the
 * @ssabrojs/hwpxjs library. Used by the 공고문 viewer/editor.
 *
 *  - .hwpx (OWPML zip)  → HwpxReader.extractHtml
 *  - .hwp  (5.0 CFB/OLE) → hwpToHwpx() first, then the same reader
 *
 * extractHtml escapes all document text and emits a constrained tag/style set
 * (p / table / strong / em / span[style] / img[data:]), so the result is safe to
 * inject. Images are embedded as self-contained data: URLs (no extra requests).
 *
 * The heavy browser bundle (~750KB, all deps inlined: jszip/cfb/fast-xml-parser/
 * pako/marked/htmlparser2) is loaded lazily and only on the client. We import the
 * "/browser" subpath explicitly so the bundler never pulls the Node build (which
 * references `fs`); the browser bundle has zero `fs` references.
 */
import type { HwpxHtmlOptions } from "@ssabrojs/hwpxjs/browser";

type Engine = typeof import("@ssabrojs/hwpxjs/browser");

let enginePromise: Promise<Engine> | null = null;

/** Lazy, memoized load of the inlined browser bundle. Client-only. */
function loadEngine(): Promise<Engine> {
  if (!enginePromise) enginePromise = import("@ssabrojs/hwpxjs/browser");
  return enginePromise;
}

/** Copy a (possibly offset) Uint8Array view into a standalone ArrayBuffer. */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

const HTML_OPTS: HwpxHtmlOptions = {
  paragraphTag: "p",
  tableClassName: "hwpx-table",
  renderImages: true,
  renderTables: true,
  renderStyles: true,
  embedImages: true, // inline images as data: URLs → self-contained, editable
  tableHeaderFirstRow: false,
};

export type HwpFormat = "hwp" | "hwpx";

export interface HwpRenderResult {
  /** Safe HTML fragment (paragraphs / tables / inline images). */
  html: string;
  /** The detected source format. */
  format: HwpFormat;
}

/**
 * Render raw 한글 bytes to an HTML fragment. Throws on encrypted / unsupported /
 * empty documents so the caller can fall back to a legacy renderer.
 */
export async function renderHwpDocToHtml(bytes: Uint8Array): Promise<HwpRenderResult> {
  const eng = await loadEngine();
  const fmt = eng.detectFormat(bytes);

  if (fmt === "hwp3") {
    throw new Error("HWP 3.0 문서는 지원하지 않아요. 한글에서 HWP 5.0 또는 .hwpx로 다시 저장해 주세요.");
  }

  let hwpxBuffer: ArrayBuffer;
  let format: HwpFormat;
  if (fmt === "hwp") {
    const converted = await eng.hwpToHwpx(bytes); // CFB/OLE → OWPML zip
    hwpxBuffer = toArrayBuffer(converted);
    format = "hwp";
  } else {
    // "hwpx" or "unknown" (some valid zips miss the signature heuristic) — try as OWPML.
    hwpxBuffer = toArrayBuffer(bytes);
    format = "hwpx";
  }

  const reader = new eng.HwpxReader();
  await reader.loadFromArrayBuffer(hwpxBuffer);
  const html = await reader.extractHtml(HTML_OPTS);
  if (!html || !html.trim()) {
    throw new Error("문서에서 표시할 내용을 찾지 못했어요.");
  }
  return { html, format };
}

/**
 * Convert an edited HTML fragment back into .hwpx (OWPML) bytes for download /
 * re-upload. Supports p / h1-6 / strong|b / em|i / code / pre / ul|ol|li /
 * blockquote / table(rowspan,colspan) / img(data URI) / br / hr.
 */
export async function htmlToHwpxBytes(html: string, title?: string) {
  const eng = await loadEngine();
  const out = await eng.htmlToHwpx(html, title ? { title } : undefined);
  // Copy into a plain ArrayBuffer-backed view so it can be used directly as a
  // BlobPart / File part under TS 5.7 typed-array generics (Uint8Array<ArrayBuffer>).
  const copy = new Uint8Array(out.byteLength);
  copy.set(out);
  return copy;
}
