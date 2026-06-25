import "server-only";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";

/**
 * Convert the app's generated markdown (the subset produced by document
 * generation + structuredToMarkdown) into a clean .docx with real Word heading
 * styles, lists, blockquotes and GFM tables. No external HTML pipeline — pure
 * docx so it runs in serverless (Node runtime).
 *
 * Supported: # ~ #### headings, - / * / + bullets, blockquotes, --- rules,
 * | pipe | tables, and inline **bold**, *italic* / _italic_, `code`.
 * Ordered lists keep their literal "1." prefix (avoids cross-list renumbering).
 */

const HEADING: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

/** Split a line into styled runs for **bold**, *italic* / _italic_, `code`. */
function parseInline(text: string, baseBold = false): TextRun[] {
  const runs: TextRun[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (t: string, opts: { bold?: boolean; italics?: boolean; font?: string } = {}) =>
    runs.push(new TextRun({ text: t, bold: baseBold || opts.bold, italics: opts.italics, font: opts.font }));
  while ((m = re.exec(text))) {
    if (m.index > last) push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__")) push(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith("`")) push(tok.slice(1, -1), { font: "Consolas" });
    else push(tok.slice(1, -1), { italics: true });
    last = m.index + tok.length;
  }
  if (last < text.length) push(text.slice(last));
  return runs.length ? runs : [new TextRun({ text, bold: baseBold })];
}

/** A `| a | b |` block → docx Table (row 2 may be a |---|---| separator). */
function buildTable(rows: string[]): Table | null {
  const cells = rows.map((r) =>
    r
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim()),
  );
  const isSep = (cs: string[]) => cs.every((c) => /^:?-{2,}:?$/.test(c));
  const body = cells.filter((cs) => !isSep(cs));
  if (body.length === 0) return null;
  const cols = Math.max(...body.map((cs) => cs.length));
  const hasHeader = cells.length > 1 && isSep(cells[1]);

  const tableRows = body.map((cs, ri) => {
    const isHeader = hasHeader && ri === 0;
    const padded = [...cs];
    while (padded.length < cols) padded.push("");
    return new TableRow({
      children: padded.map(
        (c) =>
          new TableCell({
            width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: parseInline(c, isHeader) })],
          }),
      ),
      tableHeader: isHeader,
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

function markdownToBlocks(markdown: string): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // Pipe table block
    if (/^\|.*\|$/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        rows.push(lines[i].trim());
        i++;
      }
      const table = buildTable(rows);
      if (table) out.push(table);
      else rows.forEach((r) => out.push(new Paragraph({ children: parseInline(r) })));
      continue;
    }

    if (!line) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
      out.push(
        new Paragraph({
          border: {
            bottom: { color: "CCCCCC", space: 1, style: BorderStyle.SINGLE, size: 6 },
          },
        }),
      );
      i++;
      continue;
    }

    // Heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      out.push(new Paragraph({ heading: HEADING[h[1].length], children: parseInline(h[2]) }));
      i++;
      continue;
    }

    // Blockquote → indented paragraph
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      out.push(new Paragraph({ indent: { left: 360 }, children: parseInline(q[1]) }));
      i++;
      continue;
    }

    // Bullet list
    const ul = /^[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      out.push(new Paragraph({ children: parseInline(ul[1]), bullet: { level: 0 } }));
      i++;
      continue;
    }

    // Plain paragraph (ordered-list items keep their literal "1." prefix)
    out.push(new Paragraph({ children: parseInline(line) }));
    i++;
  }

  return out;
}

/** Build a styled .docx buffer from a title + markdown body. */
export async function buildDocx(title: string, markdown: string): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.LEFT,
            children: parseInline(title || "제목 없음"),
          }),
          ...markdownToBlocks(markdown),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
