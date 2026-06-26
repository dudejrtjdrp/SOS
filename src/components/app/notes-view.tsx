"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, SearchIcon, PinIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NOTE_TYPES, getNoteType } from "@/core/notes/templates";
import { createNote } from "@/server/actions/note";
import { useRealtimeRefresh } from "@/lib/realtime";
import { NoteIcon } from "@/components/app/note-icon";
import { cn } from "@/lib/utils";

interface NoteRow {
  id: string;
  note_type: string;
  title: string | null;
  tags: string[] | null;
  pinned: boolean | null;
  updated_at: string;
}

function fmtDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function NotesView({
  projectId,
  notes,
}: {
  projectId: string;
  notes: NoteRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<string>("all");
  const [q, setQ] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [picking, setPicking] = React.useState(false);

  useRealtimeRefresh({ table: "notes", projectId, onChange: () => router.refresh() });

  const visible = notes.filter((n) => {
    if (filter !== "all" && n.note_type !== filter) return false;
    if (q.trim()) {
      const hay = `${n.title ?? ""} ${(n.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  async function create(noteType: string) {
    setPicking(false);
    setCreating(true);
    try {
      const r = await createNote({ projectId, noteType });
      if (!r.ok) {
        toast.error(r.error.message ?? "생성에 실패했어요.");
        return;
      }
      router.push(`/p/${projectId}/notes/${r.data.id}`);
    } catch {
      toast.error("생성 중 오류가 발생했어요.");
    } finally {
      setCreating(false);
    }
  }

  // Counts per type for the filter row.
  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of notes) c[n.note_type] = (c[n.note_type] ?? 0) + 1;
    return c;
  }, [notes]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">문서함</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            회의록·아이디어·리서치 등 정리한 내용을 자유롭게 적어두는 곳이에요. 저장하면 팀원 화면에도 바로 반영돼요.
          </p>
        </div>
        <div className="relative">
          <Button size="sm" onClick={() => setPicking((v) => !v)} disabled={creating}>
            {creating ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            새 문서
          </Button>
          {picking && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPicking(false)} />
              <div className="absolute right-0 z-20 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                {NOTE_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => create(t.key)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-accent"
                  >
                    <NoteIcon name={t.icon} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{t.name}</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {t.tagline}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·태그 검색"
            className="pl-8"
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <FilterChip label="전체" count={notes.length} active={filter === "all"} onClick={() => setFilter("all")} />
        {NOTE_TYPES.map((t) => (
          <FilterChip
            key={t.key}
            label={t.name}
            count={counts[t.key] ?? 0}
            active={filter === t.key}
            onClick={() => setFilter(t.key)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {notes.length === 0
            ? "아직 문서가 없어요. ‘새 문서’로 회의록이나 아이디어 노트를 만들어 보세요."
            : "조건에 맞는 문서가 없어요."}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {visible.map((n) => {
            const def = getNoteType(n.note_type);
            return (
              <li key={n.id}>
                <Link
                  href={`/p/${projectId}/notes/${n.id}`}
                  className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-2">
                    <NoteIcon name={def.icon} className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">{def.name}</span>
                    {n.pinned && <PinIcon className="ml-auto size-3.5 fill-current text-amber-500" />}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">
                    {n.title?.trim() || "제목 없음"}
                  </p>
                  <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-muted-foreground">
                    <span>{fmtDate(n.updated_at)}</span>
                    {(n.tags ?? []).slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-secondary px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("text-[10px]", active ? "text-primary" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}
