"use client";

import * as React from "react";
import {
  BoldIcon,
  ItalicIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  LinkIcon,
  TableIcon,
  MinusIcon,
  PencilIcon,
  EyeIcon,
  type LucideIcon,
} from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

type Edit = { next: string; selStart: number; selEnd: number };

/** A Notion-style "/" command. `insert` replaces the typed "/query"; `caret` is
 *  the cursor offset within `insert` after it lands. */
interface SlashCommand {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  kw: string;
  insert: string;
  caret: number;
}

const TABLE_TPL = "| 제목 | 제목 |\n| --- | --- |\n| 내용 | 내용 |\n";
const CODE_TPL = "```\n\n```\n";

const COMMANDS: SlashCommand[] = [
  { key: "h1", label: "제목 1", hint: "큰 글씨", icon: Heading1Icon, kw: "heading title 제목 h1 큰글씨", insert: "# ", caret: 2 },
  { key: "h2", label: "제목 2", hint: "중간 글씨", icon: Heading2Icon, kw: "heading title 제목 h2 중간", insert: "## ", caret: 3 },
  { key: "h3", label: "제목 3", hint: "작은 제목", icon: Heading3Icon, kw: "heading title 제목 h3 작은", insert: "### ", caret: 4 },
  { key: "ul", label: "글머리 목록", hint: "• 불릿 리스트", icon: ListIcon, kw: "bullet list 목록 리스트 불릿", insert: "- ", caret: 2 },
  { key: "ol", label: "번호 목록", hint: "1. 순서 있는 리스트", icon: ListOrderedIcon, kw: "ordered number list 번호 순서 목록", insert: "1. ", caret: 3 },
  { key: "quote", label: "인용", hint: "인용구 블록", icon: QuoteIcon, kw: "quote blockquote 인용", insert: "> ", caret: 2 },
  { key: "table", label: "표", hint: "3×2 표 삽입", icon: TableIcon, kw: "table 표 테이블 grid", insert: TABLE_TPL, caret: 2 },
  { key: "code", label: "코드 블록", hint: "```  여러 줄 코드", icon: CodeIcon, kw: "code block 코드 블록", insert: CODE_TPL, caret: 4 },
  { key: "divider", label: "구분선", hint: "── 가로 구분선", icon: MinusIcon, kw: "divider hr 구분선 line", insert: "---\n", caret: 4 },
];

/** Caret position in viewport coords, via a hidden mirror div (textarea has no
 *  native caret-rect API). Used to anchor the "/" menu next to the cursor. */
function caretCoords(el: HTMLTextAreaElement, pos: number): { left: number; bottom: number } {
  const c = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const div = document.createElement("div");
  const s = div.style;
  s.position = "fixed";
  s.visibility = "hidden";
  s.whiteSpace = "pre-wrap";
  s.overflowWrap = "break-word";
  s.overflow = "hidden";
  s.top = `${rect.top}px`;
  s.left = `${rect.left}px`;
  s.width = `${rect.width}px`;
  s.height = `${rect.height}px`;
  s.boxSizing = c.boxSizing;
  s.paddingTop = c.paddingTop;
  s.paddingRight = c.paddingRight;
  s.paddingBottom = c.paddingBottom;
  s.paddingLeft = c.paddingLeft;
  s.borderTopWidth = c.borderTopWidth;
  s.borderRightWidth = c.borderRightWidth;
  s.borderBottomWidth = c.borderBottomWidth;
  s.borderLeftWidth = c.borderLeftWidth;
  s.fontFamily = c.fontFamily;
  s.fontSize = c.fontSize;
  s.fontWeight = c.fontWeight;
  s.fontStyle = c.fontStyle;
  s.lineHeight = c.lineHeight;
  s.letterSpacing = c.letterSpacing;
  div.textContent = el.value.slice(0, pos);
  const span = document.createElement("span");
  span.textContent = "​";
  div.appendChild(span);
  document.body.appendChild(div);
  div.scrollTop = el.scrollTop;
  div.scrollLeft = el.scrollLeft;
  const sr = span.getBoundingClientRect();
  document.body.removeChild(div);
  return { left: sr.left, bottom: sr.bottom };
}

/**
 * Blog-style markdown editor: a formatting toolbar (heading sizes, bold, table…),
 * a Notion-style "/" command menu, and a 미리보기 toggle that renders the same
 * markdown with the shared <Markdown> component. Everything is stored as plain
 * markdown (`#`, `**`, `| … |`), so it renders identically anywhere.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 220,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = React.useState<"write" | "preview">("write");

  // "/" command-menu state
  const [slashAt, setSlashAt] = React.useState<number | null>(null);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [menuPos, setMenuPos] = React.useState({ left: 0, top: 0 });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => `${c.label} ${c.hint} ${c.kw}`.toLowerCase().includes(q));
  }, [query]);

  React.useEffect(() => setActive(0), [query]);

  function closeSlash() {
    setSlashAt(null);
    setQuery("");
    setActive(0);
  }

  /** Apply a pure text transform, then restore focus + selection. */
  function run(fn: (v: string, s: number, e: number) => Edit) {
    const ta = ref.current;
    if (!ta) return;
    const { next, selStart, selEnd } = fn(value, ta.selectionStart, ta.selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }

  /** Wrap the selection with inline markers (bold, italic, code). */
  function wrap(before: string, after: string, fallback = "텍스트") {
    run((v, s, e) => {
      const sel = v.slice(s, e) || fallback;
      const next = v.slice(0, s) + before + sel + after + v.slice(e);
      const selStart = s + before.length;
      return { next, selStart, selEnd: selStart + sel.length };
    });
  }

  function link() {
    run((v, s, e) => {
      const sel = v.slice(s, e) || "링크 텍스트";
      const insert = `[${sel}](url)`;
      const next = v.slice(0, s) + insert + v.slice(e);
      const urlStart = s + 1 + sel.length + 2;
      return { next, selStart: urlStart, selEnd: urlStart + 3 };
    });
  }

  /** Transform every line touched by the selection. */
  function eachLine(map: (line: string) => string) {
    run((v, s, e) => {
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      let le = v.indexOf("\n", e);
      if (le === -1) le = v.length;
      const replaced = v.slice(ls, le).split("\n").map(map).join("\n");
      const next = v.slice(0, ls) + replaced + v.slice(le);
      return { next, selStart: ls, selEnd: ls + replaced.length };
    });
  }

  const strip = (ln: string) => ln.replace(/^(#{1,6}\s+|>\s+|[-*]\s+|\d+\.\s+)/, "");

  const heading = (level: 1 | 2 | 3) =>
    eachLine((ln) => `${"#".repeat(level)} ${strip(ln)}`);
  const bullet = () => eachLine((ln) => (/^[-*]\s+/.test(ln) ? strip(ln) : `- ${strip(ln)}`));
  const ordered = () => {
    let i = 0;
    eachLine((ln) => {
      i += 1;
      return /^\d+\.\s+/.test(ln) ? strip(ln) : `${i}. ${strip(ln)}`;
    });
  };
  const quote = () => eachLine((ln) => (/^>\s+/.test(ln) ? strip(ln) : `> ${strip(ln)}`));

  function insertTable() {
    run((v, s) => {
      const atStart = s === 0 || v[s - 1] === "\n";
      const pre = atStart ? "" : "\n";
      const next = v.slice(0, s) + pre + TABLE_TPL + v.slice(s);
      const caret = s + pre.length + 2; // first 제목 cell
      return { next, selStart: caret, selEnd: caret + 2 };
    });
  }

  /** Sync the "/" menu against the latest value + caret on every change. */
  function syncSlash(v: string, caret: number) {
    if (slashAt == null) {
      const ch = v[caret - 1];
      const prev = v[caret - 2];
      if (ch === "/" && (caret === 1 || prev === " " || prev === "\n" || prev === "\t")) {
        setSlashAt(caret - 1);
        setQuery("");
        setActive(0);
        const ta = ref.current;
        if (ta) {
          const { left, bottom } = caretCoords(ta, caret);
          setMenuPos({ left, top: bottom + 6 });
        }
      }
      return;
    }
    if (caret <= slashAt || v[slashAt] !== "/") return closeSlash();
    const q = v.slice(slashAt + 1, caret);
    if (/\s/.test(q)) return closeSlash();
    setQuery(q);
    const ta = ref.current;
    if (ta) {
      const { left, bottom } = caretCoords(ta, caret);
      setMenuPos({ left, top: bottom + 6 });
    }
  }

  function selectCommand(cmd: SlashCommand) {
    const ta = ref.current;
    if (!ta || slashAt == null) return;
    const to = ta.selectionStart;
    const next = value.slice(0, slashAt) + cmd.insert + value.slice(to);
    onChange(next);
    const pos = slashAt + cmd.caret;
    closeSlash();
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (slashAt != null && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        return setActive((a) => Math.min(a + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        return setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        return selectCommand(filtered[active] ?? filtered[0]);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return closeSlash();
      }
    }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      wrap("**", "**");
    } else if (mod && (e.key === "i" || e.key === "I")) {
      e.preventDefault();
      wrap("*", "*");
    }
  }

  const dim = mode === "preview";

  return (
    <div className={cn("rounded-md border border-input bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
        <TBtn title="제목 1 · 큰 글씨" onClick={() => heading(1)} icon={Heading1Icon} disabled={dim} />
        <TBtn title="제목 2 · 중간 글씨" onClick={() => heading(2)} icon={Heading2Icon} disabled={dim} />
        <TBtn title="제목 3 · 작은 제목" onClick={() => heading(3)} icon={Heading3Icon} disabled={dim} />
        <Sep />
        <TBtn title="굵게 (Ctrl/⌘+B)" onClick={() => wrap("**", "**")} icon={BoldIcon} disabled={dim} />
        <TBtn title="기울임 (Ctrl/⌘+I)" onClick={() => wrap("*", "*")} icon={ItalicIcon} disabled={dim} />
        <TBtn title="인라인 코드" onClick={() => wrap("`", "`", "코드")} icon={CodeIcon} disabled={dim} />
        <TBtn title="링크" onClick={link} icon={LinkIcon} disabled={dim} />
        <Sep />
        <TBtn title="글머리 목록" onClick={bullet} icon={ListIcon} disabled={dim} />
        <TBtn title="번호 목록" onClick={ordered} icon={ListOrderedIcon} disabled={dim} />
        <TBtn title="인용" onClick={quote} icon={QuoteIcon} disabled={dim} />
        <TBtn title="표 삽입" onClick={insertTable} icon={TableIcon} disabled={dim} />

        <button
          type="button"
          onClick={() => setMode((m) => (m === "write" ? "preview" : "write"))}
          className="ml-auto inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {mode === "write" ? <EyeIcon className="size-3.5" /> : <PencilIcon className="size-3.5" />}
          {mode === "write" ? "미리보기" : "편집"}
        </button>
      </div>

      {mode === "write" ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            syncSlash(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={onKeyDown}
          onBlur={closeSlash}
          placeholder={placeholder}
          style={{ minHeight }}
          className="block w-full resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
      ) : (
        <div className="px-3 py-2.5" style={{ minHeight }}>
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">미리볼 내용이 없어요.</p>
          )}
        </div>
      )}

      {slashAt != null && (
        <div
          style={{ position: "fixed", left: Math.min(menuPos.left, (typeof window !== "undefined" ? window.innerWidth : 9999) - 260), top: menuPos.top, zIndex: 50 }}
          className="w-60 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
          // keep textarea focus when interacting with the menu
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            블록 삽입{query ? ` · “${query}”` : ""}
          </div>
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">일치하는 명령이 없어요</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.key}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => selectCommand(cmd)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
                  i === active ? "bg-accent" : "hover:bg-accent",
                )}
              >
                <cmd.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-sm">{cmd.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{cmd.hint}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TBtn({
  title,
  onClick,
  icon: Icon,
  disabled,
}: {
  title: string;
  onClick: () => void;
  icon: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-4" />
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-4 w-px bg-border" />;
}
