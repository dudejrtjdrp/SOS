"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpenIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  RefreshCwIcon,
  PencilIcon,
  PlusIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KB_FIELDS, kbCompleteness } from "@/core/schemas/kb";
import { updateKnowledgeFields } from "@/server/actions/knowledge";

/** Copy text to the clipboard with a legacy fallback for insecure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Global, always-available Knowledge Base reference + quick editor.
 * Lives in the project layout so a single instance persists across every
 * project page — the user can keep it open while using any tool, copy-paste
 * KB fields one click at a time, AND edit them in place (debounced autosave,
 * same mechanism as the full KB editor) without leaving the page.
 *
 * Non-blocking: the drawer overlays only the right edge with no backdrop,
 * so the page behind it stays fully interactive.
 */
export function KBQuickPanel({
  projectId,
  projectName,
  fields: propFields,
}: {
  projectId: string;
  projectName: string;
  fields: Record<string, string>;
}) {
  const [fields, setFields] = React.useState<Record<string, string>>(propFields);
  const [open, setOpen] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const wantSync = React.useRef(false);
  const router = useRouter();

  const completeness = kbCompleteness(fields);
  const filledCount = KB_FIELDS.filter((f) => (fields[f.key] ?? "").trim()).length;

  // Adopt fresh server values only after an explicit refresh — never clobber
  // in-flight local edits on an incidental re-render.
  const propJson = JSON.stringify(propFields);
  React.useEffect(() => {
    if (wantSync.current) {
      setFields(propFields);
      wantSync.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propJson]);

  // Escape exits edit mode first, then closes the drawer.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (editingKey) setEditingKey(null);
      else setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editingKey]);

  function onChange(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(key, value), 800);
  }

  async function save(key: string, value: string) {
    setSaving(true);
    const r = await updateKnowledgeFields({ projectId, fields: { [key]: value } });
    setSaving(false);
    if (!r.ok) toast.error(r.error.message);
    else setSavedAt(Date.now());
  }

  function refresh() {
    wantSync.current = true;
    router.refresh();
  }

  async function copyField(key: string, label: string, value: string) {
    if (!(await copyText(value))) return toast.error("복사에 실패했습니다.");
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
    toast.success(`${label} 복사됨`);
  }

  async function copyAll() {
    const title = (fields.project_name ?? "").trim() || projectName;
    const blocks = KB_FIELDS.filter(
      (f) => f.key !== "project_name" && (fields[f.key] ?? "").trim(),
    ).map((f) => `## ${f.label}\n${(fields[f.key] ?? "").trim()}`);
    if (blocks.length === 0) return toast.error("아직 채워진 항목이 없습니다.");
    const text = `# ${title}\n\n${blocks.join("\n\n")}`;
    if (!(await copyText(text))) return toast.error("복사에 실패했습니다.");
    toast.success("Knowledge Base 전체를 복사했습니다.");
  }

  return (
    <>
      {/* Floating toggle — top-right of every project page */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 top-3 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:border-primary hover:text-primary"
          aria-label="Knowledge Base 열기"
          title="Knowledge Base (Esc로 닫기)"
        >
          <BookOpenIcon className="size-4" />
          <span className="hidden sm:inline">Knowledge Base</span>
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            {completeness}%
          </span>
        </button>
      )}

      {/* Drawer — clip container prevents the off-screen panel from creating
          horizontal scroll, and goes pointer-events-none while closed so the
          page stays clickable. */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-[380px] overflow-hidden",
          open ? "" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <aside
          className={cn(
            "flex h-full w-full flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-2">
              <BookOpenIcon className="size-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold">Knowledge Base</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={refresh}
                aria-label="새로고침"
                title="최신 내용 불러오기"
              >
                <RefreshCwIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setOpen(false)}
                aria-label="닫기"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Completeness + save status + copy-all */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {filledCount}/{KB_FIELDS.length}
              {saving ? " · 저장 중…" : savedAt ? " · 저장됨" : ""}
            </span>
            <Button size="sm" variant="outline" className="h-7" onClick={copyAll}>
              <CopyIcon className="size-3.5" />
              전체 복사
            </Button>
          </div>

          {/* Fields */}
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {KB_FIELDS.map((f) => {
              const value = fields[f.key] ?? "";
              const trimmed = value.trim();
              const editing = editingKey === f.key;
              const copied = copiedKey === f.key;

              // ── Edit mode ──────────────────────────────────────────
              if (editing) {
                return (
                  <div
                    key={f.key}
                    className="rounded-lg border border-primary bg-background px-3 py-2.5 ring-1 ring-primary/30"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">{f.label}</span>
                      <button
                        type="button"
                        onClick={() => setEditingKey(null)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-primary transition-opacity hover:opacity-70"
                      >
                        <CheckIcon className="size-3.5" />
                        완료
                      </button>
                    </div>
                    {f.type === "text" ? (
                      <Input
                        autoFocus
                        value={value}
                        placeholder={f.placeholder}
                        onChange={(e) => onChange(f.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingKey(null);
                        }}
                      />
                    ) : (
                      <Textarea
                        autoFocus
                        value={value}
                        placeholder={f.placeholder}
                        className="min-h-[88px]"
                        onChange={(e) => onChange(f.key, e.target.value)}
                      />
                    )}
                    {f.description && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {f.description}
                      </p>
                    )}
                  </div>
                );
              }

              // ── Empty (read) ───────────────────────────────────────
              if (!trimmed) {
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setEditingKey(f.key)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
                  >
                    <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                      <PlusIcon className="size-3.5" />
                      추가
                    </span>
                  </button>
                );
              }

              // ── Filled (read + copy + edit) ────────────────────────
              return (
                <div
                  key={f.key}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:border-primary/40"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingKey(f.key)}
                        className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
                        aria-label={`${f.label} 편집`}
                        title="편집"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyField(f.key, f.label, trimmed)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                          copied ? "text-success" : "text-muted-foreground hover:text-primary",
                        )}
                        aria-label={`${f.label} 복사`}
                      >
                        {copied ? (
                          <CheckIcon className="size-3.5" />
                        ) : (
                          <CopyIcon className="size-3.5" />
                        )}
                        {copied ? "복사됨" : "복사"}
                      </button>
                    </div>
                  </div>
                  <p
                    onClick={() => setEditingKey(f.key)}
                    className="cursor-text whitespace-pre-wrap rounded text-sm leading-relaxed text-foreground/90"
                    title="클릭하여 편집"
                  >
                    {trimmed}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer — full page still hosts RAG sources / uploads */}
          <div className="shrink-0 border-t border-border p-3">
            <Link
              href={`/p/${projectId}/knowledge`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ExternalLinkIcon className="size-3.5" />
              전체 페이지 · 자료(RAG) 관리
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
