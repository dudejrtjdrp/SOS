"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PencilIcon,
  EyeIcon,
  SaveIcon,
  Loader2Icon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { saveDocumentVersion } from "@/server/actions/document";
import { assembleDocumentMarkdown } from "@/core/documents/compose";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DocumentActions } from "./document-actions";
import type { DocumentSection } from "@/lib/queries";

type Block = { id: string; title: string; body_md: string };

let _seq = 0;
const newId = () => `s${Date.now()}_${_seq++}`;

/**
 * Document detail = read view + inline editor over the SAME page. Editing seeds
 * blocks from the current version's sections and saves a NEW immutable version
 * via saveDocumentVersion (history is preserved; the viewer always shows current).
 */
export function DocumentDetail({
  documentId,
  title,
  version,
  bodyMd,
  sections,
}: {
  documentId: string;
  title: string;
  version: number;
  bodyMd: string;
  sections: DocumentSection[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title);
  const [blocks, setBlocks] = React.useState<Block[]>([]);

  /** Seed the editor from the latest server state every time we enter edit mode. */
  function seed(): Block[] {
    if (sections.length > 0) {
      return sections.map((s) => ({ id: s.id || newId(), title: s.title, body_md: s.body_md }));
    }
    // No structured sections (rare) — start from the rendered body as one block.
    return [{ id: newId(), title: title || "본문", body_md: bodyMd }];
  }

  function startEdit() {
    setDraftTitle(title);
    setBlocks(seed());
    setPreview(false);
    setEditing(true);
  }

  function update(id: string, patch: Partial<Block>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
  }
  function addEmpty() {
    setBlocks((bs) => [...bs, { id: newId(), title: "새 섹션", body_md: "" }]);
  }
  function move(from: number, to: number) {
    setBlocks((bs) => {
      if (to < 0 || to >= bs.length) return bs;
      const next = bs.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  const composed = React.useMemo(
    () => assembleDocumentMarkdown(blocks.map((b) => ({ title: b.title, body_md: b.body_md }))),
    [blocks],
  );

  async function save() {
    if (!draftTitle.trim()) {
      toast.error("문서 제목을 입력하세요.");
      return;
    }
    if (blocks.length === 0) {
      toast.error("섹션을 최소 한 개 두세요.");
      return;
    }
    setSaving(true);
    try {
      const r = await saveDocumentVersion({
        documentId,
        title: draftTitle.trim(),
        sections: blocks.map((b) => ({ id: b.id, title: b.title.trim() || "제목 없음", body_md: b.body_md })),
      });
      if (!r.ok) {
        toast.error(r.error.message ?? "저장에 실패했어요.");
        return;
      }
      toast.success(`버전 ${r.data.version}으로 저장했어요.`);
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  // ── Read view ──────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <Badge variant="outline">v{version}</Badge>
          <Button size="sm" variant="outline" className="ml-auto" onClick={startEdit}>
            <PencilIcon className="size-4" />
            편집
          </Button>
        </header>

        <article className="rounded-xl border border-border bg-card p-6">
          {bodyMd ? (
            <Markdown>{bodyMd}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">본문이 비어 있습니다.</p>
          )}
        </article>

        <div className="mt-6">
          <DocumentActions documentId={documentId} title={title} markdown={bodyMd} />
        </div>
      </div>
    );
  }

  // ── Edit view ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">문서 편집</h1>
        <Badge variant="secondary">현재 v{version} · 저장 시 새 버전</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPreview((v) => !v)}>
            {preview ? <PencilIcon className="size-4" /> : <EyeIcon className="size-4" />}
            {preview ? "편집" : "미리보기"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            <XIcon className="size-4" />
            취소
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            저장
          </Button>
        </div>
      </header>

      <div className="mb-4">
        <Input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="문서 제목"
          className="font-medium"
        />
      </div>

      {preview ? (
        <div className="rounded-xl border border-border bg-card p-6">
          {composed.trim() ? (
            <Markdown>{`# ${draftTitle || "제목 없음"}\n\n${composed}`}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">미리볼 내용이 없어요.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((b, i) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-1.5">
                <Input
                  value={b.title}
                  onChange={(e) => update(b.id, { title: e.target.value })}
                  className="h-8 flex-1 font-medium"
                  placeholder="섹션 제목"
                />
                <span className="w-5 text-center text-[11px] text-muted-foreground">{i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  title="위로"
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => move(i, i + 1)}
                  disabled={i === blocks.length - 1}
                  title="아래로"
                >
                  <ArrowDownIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-[var(--danger)]"
                  onClick={() => remove(b.id)}
                  title="삭제"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
              <Textarea
                value={b.body_md}
                onChange={(e) => update(b.id, { body_md: e.target.value })}
                placeholder="마크다운으로 내용을 작성하세요"
                className="mt-2 min-h-[160px] font-mono text-xs leading-relaxed"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addEmpty} className="w-full border-dashed">
            <PlusIcon className="size-4" />
            빈 섹션 추가
          </Button>
        </div>
      )}
    </div>
  );
}
