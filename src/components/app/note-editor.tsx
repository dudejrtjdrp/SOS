"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  SaveIcon,
  CheckIcon,
  Trash2Icon,
  Loader2Icon,
  RefreshCwIcon,
  PinIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getNoteType } from "@/core/notes/templates";
import { updateNote, deleteNote } from "@/server/actions/note";
import { useRealtimeRefresh } from "@/lib/realtime";
import { NoteIcon } from "@/components/app/note-icon";
import { MarkdownEditor } from "@/components/app/markdown-editor";
import { cn } from "@/lib/utils";

interface NoteData {
  id: string;
  project_id: string;
  note_type: string;
  title: string | null;
  fields: unknown;
  body_md: string | null;
  tags: string[] | null;
  pinned: boolean | null;
  updated_at: string;
}

function normalizeFields(f: unknown): Record<string, string> {
  if (!f || typeof f !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(f as Record<string, unknown>)) {
    out[k] = typeof v === "string" ? v : v == null ? "" : String(v);
  }
  return out;
}

export function NoteEditor({ note }: { note: NoteData }) {
  const router = useRouter();
  const def = getNoteType(note.note_type);

  const [title, setTitle] = React.useState(note.title ?? "");
  const [fields, setFields] = React.useState<Record<string, string>>(() =>
    normalizeFields(note.fields),
  );
  const [body, setBody] = React.useState(note.body_md ?? "");
  const [tags, setTags] = React.useState<string[]>(note.tags ?? []);
  const [tagDraft, setTagDraft] = React.useState("");
  const [pinned, setPinned] = React.useState(!!note.pinned);
  const [saving, setSaving] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [remote, setRemote] = React.useState(false);

  const snapshot = JSON.stringify({ title, fields, body, tags, pinned });
  const seedRef = React.useRef<string | null>(null);
  if (seedRef.current === null) seedRef.current = snapshot;
  const dirty = snapshot !== seedRef.current;
  const dirtyRef = React.useRef(dirty);
  dirtyRef.current = dirty;
  const lastUpdatedRef = React.useRef(note.updated_at);

  // Revert the "저장됨" confirmation the moment the user edits again.
  React.useEffect(() => {
    if (dirty) setJustSaved(false);
  }, [dirty]);

  // Reseed local state when the server sends a newer row (after router.refresh),
  // but only if we have no unsaved edits — otherwise warn instead of clobbering.
  React.useEffect(() => {
    if (note.updated_at === lastUpdatedRef.current) return;
    lastUpdatedRef.current = note.updated_at;
    if (dirtyRef.current) {
      setRemote(true);
      return;
    }
    setTitle(note.title ?? "");
    setFields(normalizeFields(note.fields));
    setBody(note.body_md ?? "");
    setTags(note.tags ?? []);
    setPinned(!!note.pinned);
    seedRef.current = JSON.stringify({
      title: note.title ?? "",
      fields: normalizeFields(note.fields),
      body: note.body_md ?? "",
      tags: note.tags ?? [],
      pinned: !!note.pinned,
    });
    setRemote(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  useRealtimeRefresh({
    table: "notes",
    filter: `id=eq.${note.id}`,
    onChange: () => {
      if (dirtyRef.current) setRemote(true);
      else router.refresh();
    },
  });

  function setField(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }
  function addTag() {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags((xs) => [...xs, t]);
    setTagDraft("");
  }

  async function save() {
    setSaving(true);
    try {
      const r = await updateNote({
        noteId: note.id,
        projectId: note.project_id,
        title,
        fields,
        body_md: body,
        tags,
        pinned,
      });
      if (!r.ok) {
        toast.error(r.error.message ?? "저장에 실패했어요.");
        return;
      }
      seedRef.current = snapshot;
      lastUpdatedRef.current = r.data.updatedAt;
      setRemote(false);
      setJustSaved(true);
      toast.success("저장했어요.");
      router.refresh();
    } catch {
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      const r = await deleteNote({ noteId: note.id, projectId: note.project_id });
      if (!r.ok) {
        toast.error(r.error.message ?? "삭제에 실패했어요.");
        return;
      }
      toast.success("삭제했어요.");
      router.push(`/p/${note.project_id}/notes`);
    } catch {
      toast.error("삭제 중 오류가 발생했어요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href={`/p/${note.project_id}/notes`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          노트
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPinned((p) => !p)}
            className={pinned ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}
            title={pinned ? "고정 해제" : "고정"}
          >
            <PinIcon className={cn("size-4", pinned && "fill-current")} />
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : justSaved && !dirty ? (
              <CheckIcon className="size-4" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            {saving ? "저장 중" : justSaved && !dirty ? "저장됨" : "저장"}
          </Button>
        </div>
      </div>

      {remote && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
          <span className="text-amber-700 dark:text-amber-400">
            다른 팀원이 이 노트를 수정했어요. 지금 불러오면 저장하지 않은 내 변경은 사라져요.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => {
              lastUpdatedRef.current = "";
              seedRef.current = snapshot; // mark clean so reseed proceeds
              router.refresh();
            }}
          >
            <RefreshCwIcon className="size-4" />
            불러오기
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRemote(false)}>
            무시
          </Button>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <NoteIcon name={def.icon} className="size-4" />
        {def.name}
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목 없음"
        className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
      />

      <div className="mt-6 space-y-5">
        {def.fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            {f.type === "text" ? (
              <Input
                value={fields[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1.5"
              />
            ) : f.type === "date" ? (
              <input
                type="date"
                value={fields[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                className="mt-1.5 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <Textarea
                value={fields[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={cn("mt-1.5", f.type === "list" ? "min-h-[64px]" : "min-h-[88px]")}
              />
            )}
          </div>
        ))}

        <div>
          <Label className="text-xs text-muted-foreground">
            {def.fields.length ? "메모" : "내용"}
          </Label>
          <MarkdownEditor
            value={body}
            onChange={setBody}
            placeholder="내용을 입력하세요. ‘/’ 를 입력하면 제목·목록·표 등을 넣을 수 있어요."
            className="mt-1.5"
            minHeight={220}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">태그</Label>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={() => setTags((xs) => xs.filter((x) => x !== t))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="태그 추가 + Enter"
              className="h-7 w-36 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-border pt-4">
        {confirmDel ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">이 노트를 삭제할까요?</span>
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
              삭제
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>
              취소
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDel(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
            노트 삭제
          </Button>
        )}
      </div>
    </div>
  );
}
