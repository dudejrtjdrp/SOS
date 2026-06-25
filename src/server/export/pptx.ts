import "server-only";
import pptxgen from "pptxgenjs";

/**
 * Deck export: one section → one slide (the agreed P0-2 minimum). Section title
 * becomes the slide title; the body's markdown is flattened to bullets; the FULL
 * raw body is attached as speaker notes so nothing is lost when the slide trims.
 * Pure pptxgenjs so it runs in the Node serverless runtime.
 */

export interface DeckSection {
  title: string;
  body_md: string;
}

type Bullet = { text: string; level: number; bold: boolean };

const MAX_BULLETS = 8;

/** Drop inline markdown markers — slides read better as plain text. */
function stripInline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

/** Flatten a section's markdown body into indented slide bullets. */
function sectionToBullets(md: string): Bullet[] {
  const out: Bullet[] = [];
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      i++;
      continue;
    }
    // Table row → cells joined into one bullet (skip the |---| separator)
    if (/^\|.*\|$/.test(line)) {
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) {
        out.push({ text: cells.join("  ·  "), level: 0, bold: false });
      }
      i++;
      continue;
    }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
      i++;
      continue;
    }
    // Heading inside a section → bold lead-in bullet
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      out.push({ text: stripInline(h[2]), level: 0, bold: true });
      i++;
      continue;
    }
    const indented = /^(\s+)[-*+]\s+/.test(raw);
    const ul = /^[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      out.push({ text: stripInline(ul[1]), level: indented ? 1 : 0, bold: false });
      i++;
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      out.push({ text: stripInline(ol[1]), level: 0, bold: false });
      i++;
      continue;
    }
    out.push({ text: stripInline(line), level: 0, bold: false });
    i++;
  }
  return out;
}

/** Fallback: derive slide sections from a flat document body (split on `## `). */
export function deckSectionsFromMarkdown(bodyMd: string): DeckSection[] {
  const lines = (bodyMd || "").replace(/\r\n/g, "\n").split("\n");
  const sections: DeckSection[] = [];
  let current: DeckSection | null = null;
  for (const line of lines) {
    const h = /^##\s+(.*)$/.exec(line.trim());
    if (h) {
      current = { title: h[1].trim(), body_md: "" };
      sections.push(current);
    } else if (current) {
      current.body_md += line + "\n";
    } else if (line.trim()) {
      current = { title: "개요", body_md: line + "\n" };
      sections.push(current);
    }
  }
  return sections.map((s) => ({ ...s, body_md: s.body_md.trim() }));
}

/** Build a .pptx buffer: a title slide + one slide per section (+ speaker notes). */
export async function buildPptx(title: string, sections: DeckSection[]): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33" × 7.5"

  // Title slide
  const cover = pptx.addSlide();
  cover.background = { color: "0B1220" };
  cover.addText(title || "제목 없음", {
    x: 0.7,
    y: 2.7,
    w: 12,
    h: 1.4,
    fontSize: 40,
    bold: true,
    color: "FFFFFF",
  });
  cover.addText(new Date().toLocaleDateString("ko-KR"), {
    x: 0.7,
    y: 4.1,
    w: 12,
    h: 0.5,
    fontSize: 14,
    color: "9FB3C8",
  });

  // Content slides
  for (const s of sections) {
    const slide = pptx.addSlide();
    slide.addText(s.title || "", {
      x: 0.6,
      y: 0.4,
      w: 12.1,
      h: 0.9,
      fontSize: 26,
      bold: true,
      color: "0B1220",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6,
      y: 1.3,
      w: 12.1,
      h: 0,
      line: { color: "2563EB", width: 2 },
    });

    const bullets = sectionToBullets(s.body_md);
    const shown = bullets.slice(0, MAX_BULLETS);
    if (bullets.length > MAX_BULLETS) {
      shown.push({ text: "… (자세한 내용은 발표 노트 참고)", level: 0, bold: false });
    }
    if (shown.length > 0) {
      slide.addText(
        shown.map((b) => ({
          text: b.text,
          options: {
            bullet: true,
            indentLevel: b.level,
            bold: b.bold,
            fontSize: 16,
            color: "1F2937",
            breakLine: true,
          },
        })),
        { x: 0.7, y: 1.6, w: 12, h: 5.3, valign: "top" },
      );
    }
    // Keep the full prose as speaker notes — slides trim, notes don't.
    if (s.body_md) slide.addNotes(s.body_md);
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
