/**
 * Minimal in-browser .hwpx (한글 신형) reader/renderer.
 *
 * .hwpx is an OWPML document in a ZIP/OPC container (unlike legacy binary .hwp,
 * which hwp.js handles). There is no off-the-shelf browser renderer, so we:
 *   1. unzip the archive (tiny ZIP central-directory reader + pako inflate),
 *   2. render Contents/section*.xml (OWPML) to safe HTML — paragraphs, tables,
 *      inline text, and best-effort BinData images,
 *   3. fall back to the spec's Preview/PrvText.txt, then Preview/PrvImage.png.
 *
 * All document text is HTML-escaped; only our own tags + data: image URLs are
 * emitted, so the result is safe to inject.
 */
import pako from "pako";

// ── ZIP (store + deflate only; sizes read from the central directory so data
//    descriptors are handled). Throws on ZIP64 / malformed input. ───────────
export function unzip(buf: Uint8Array): Record<string, Uint8Array> {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const n = buf.byteLength;
  const u32 = (o: number) => d.getUint32(o, true);
  const u16 = (o: number) => d.getUint16(o, true);

  // End of Central Directory record (0x06054b50), scanned from the end.
  let eocd = -1;
  for (let i = n - 22, min = Math.max(0, n - 22 - 0xffff); i >= min; i--) {
    if (u32(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP 구조를 찾지 못했어요.");
  const count = u16(eocd + 10);
  let p = u32(eocd + 16);
  if (p === 0xffffffff || count === 0xffff) throw new Error("ZIP64는 지원하지 않아요.");

  const out: Record<string, Uint8Array> = {};
  const dec = new TextDecoder("utf-8");
  for (let e = 0; e < count; e++) {
    if (u32(p) !== 0x02014b50) break; // central directory file header
    const method = u16(p + 10);
    const compSize = u32(p + 20);
    const nameLen = u16(p + 28);
    const extraLen = u16(p + 30);
    const commentLen = u16(p + 32);
    const lhOffset = u32(p + 42);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));

    if (u32(lhOffset) === 0x04034b50) {
      const lhNameLen = u16(lhOffset + 26);
      const lhExtraLen = u16(lhOffset + 28);
      const start = lhOffset + 30 + lhNameLen + lhExtraLen;
      const comp = buf.subarray(start, start + compSize);
      try {
        if (method === 0) out[name] = comp;
        else if (method === 8 && compSize > 0) out[name] = pako.inflateRaw(comp);
      } catch {
        /* skip undecodable entry */
      }
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// ── HTML helpers ────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

function dataUrl(bytes: Uint8Array, name: string): string {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const mime = EXT_MIME[ext] ?? "application/octet-stream";
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(bin)}`;
}

function sectionNum(path: string): number {
  return Number(/section(\d+)\.xml$/i.exec(path)?.[1] ?? 0);
}

function childEls(el: Element): Element[] {
  return Array.from(el.children);
}

// ── OWPML → HTML ──────────────────────────────────────────────────────────
function collectInline(node: Element): string {
  let s = "";
  for (const c of childEls(node)) {
    const ln = c.localName;
    if (ln === "tbl" || ln === "pic") continue; // rendered as blocks
    if (ln === "t") s += c.textContent ?? "";
    else if (ln === "lineBreak" || ln === "lineseg") s += "\n";
    else if (ln === "tab") s += "\t";
    else s += collectInline(c);
  }
  return s;
}

function collectBlocks(node: Element, kind: "tbl" | "pic"): Element[] {
  const out: Element[] = [];
  for (const c of childEls(node)) {
    if (c.localName === kind) out.push(c); // don't recurse into matched block
    else if (c.localName !== "tbl") out.push(...collectBlocks(c, kind));
  }
  return out;
}

function renderImage(pic: Element, bin: Record<string, string>): string {
  let ref = pic.getAttribute("binaryItemIDRef") ?? "";
  if (!ref) {
    const list = pic.getElementsByTagName("*");
    for (let i = 0; i < list.length; i++) {
      const r = list[i].getAttribute("binaryItemIDRef");
      if (r) {
        ref = r;
        break;
      }
    }
  }
  if (!ref) return "";
  const url = bin[ref.toLowerCase()] ?? bin[ref.replace(/^0+/, "").toLowerCase()];
  return url ? `<img class="hwpx-img" src="${url}" alt="" />` : "";
}

function renderTable(tbl: Element, bin: Record<string, string>): string {
  let rows = "";
  for (const tr of childEls(tbl)) {
    if (tr.localName !== "tr") continue;
    let cells = "";
    for (const tc of childEls(tr)) {
      if (tc.localName !== "tc") continue;
      let cell = "";
      for (const sub of childEls(tc)) {
        if (sub.localName === "subList") for (const c of childEls(sub)) cell += renderElement(c, bin);
        else cell += renderElement(sub, bin);
      }
      cells += `<td>${cell || "&nbsp;"}</td>`;
    }
    if (cells) rows += `<tr>${cells}</tr>`;
  }
  return rows ? `<table class="hwpx-tbl"><tbody>${rows}</tbody></table>` : "";
}

function renderElement(el: Element, bin: Record<string, string>): string {
  const ln = el.localName;
  if (ln === "tbl") return renderTable(el, bin);
  if (ln === "p") {
    const text = escapeHtml(collectInline(el)).replace(/\n/g, "<br/>").replace(/\t/g, "&emsp;");
    let h = text.trim() ? `<p>${text}</p>` : "";
    for (const pic of collectBlocks(el, "pic")) h += renderImage(pic, bin);
    for (const t of collectBlocks(el, "tbl")) h += renderTable(t, bin);
    return h || "";
  }
  let h = "";
  for (const c of childEls(el)) h += renderElement(c, bin);
  return h;
}

function buildBin(files: Record<string, Uint8Array>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const k of Object.keys(files)) {
    const m = /(?:^|\/)BinData\/([^/]+)\.(png|jpe?g|gif|bmp|svg)$/i.exec(k);
    if (m) map[m[1].toLowerCase()] = dataUrl(files[k], k);
  }
  return map;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

/** Parse .hwpx bytes into safe HTML. Throws only if nothing renderable found. */
export function parseHwpx(buf: Uint8Array): string {
  const files = unzip(buf);
  const keys = Object.keys(files);
  const dec = new TextDecoder("utf-8");
  const find = (re: RegExp) => keys.filter((k) => re.test(k));

  const sections = find(/(?:^|\/)Contents\/section\d+\.xml$/i).sort(
    (a, b) => sectionNum(a) - sectionNum(b),
  );

  if (sections.length && typeof DOMParser !== "undefined") {
    try {
      const bin = buildBin(files);
      const parser = new DOMParser();
      let body = "";
      for (const s of sections) {
        const doc = parser.parseFromString(dec.decode(files[s]), "application/xml");
        if (doc.getElementsByTagName("parsererror").length) continue;
        body += renderElement(doc.documentElement, bin);
      }
      if (stripTags(body).trim().length > 0 || /<img/.test(body))
        return `<div class="hwpx-doc">${body}</div>`;
    } catch {
      /* fall back below */
    }
  }

  const prvText = find(/(?:^|\/)Preview\/PrvText\.txt$/i)[0];
  if (prvText) {
    const txt = dec.decode(files[prvText]);
    if (txt.trim()) return `<div class="hwpx-doc"><pre class="hwpx-pre">${escapeHtml(txt)}</pre></div>`;
  }

  const prvImg = find(/(?:^|\/)Preview\/PrvImage\.(?:png|jpe?g|gif|bmp)$/i)[0];
  if (prvImg)
    return `<div class="hwpx-doc"><img class="hwpx-prv" src="${dataUrl(files[prvImg], prvImg)}" alt="미리보기" /></div>`;

  throw new Error("한글 문서(.hwpx) 내용을 읽지 못했어요.");
}
