"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  GripVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Trash2Icon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  Loader2Icon,
  SaveIcon,
  CheckCircle2Icon,
  DatabaseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { Label } from "@/components/ui/label";
import { composeManualDocument } from "@/server/actions/document";
import { assembleDocumentMarkdown } from "@/core/documents/compose";
import { KB_FIELD_LABEL } from "@/core/modules/guide";
import type { ComposeArtifact } from "@/lib/queries";

type Block = { id: string; title: string; body_md: string; sourceId?: string };

let _seq = 0;
const newId = () => `b${Date.now()}_${_seq++}`;

export function DocumentComposer({
  projectId,
  artifacts,
  kbFields = {},
  embedded = false,
}: {
  projectId: string;
  artifacts: ComposeArtifact[];
  /** Knowledge Base fields (key → value), pulled in as blocks from the palette. */
  kbFields?: Record<string, string>;
  /** When embedded in another page (e.g. 직접 조립 수동 모드), drop the outer page
   *  padding and the duplicate page heading. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [blocks, setBlocks] = React.useState<Block[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const dragIndex = React.useRef<number | null>(null);

  const usedSources = React.useMemo(
    () => new Set(blocks.map((b) => b.sourceId).filter(Boolean) as string[]),
    [blocks],
  );

  // Knowledge Base fields that actually have a value — offered in the palette
  // so the user can pull project data into a block without retyping it.
  const kbEntries = React.useMemo(
    () =>
      Object.keys(KB_FIELD_LABEL)
        .map((key) => ({ key, label: KB_FIELD_LABEL[key], value: (kbFields[key] ?? "").trim() }))
        .filter((e) => e.value !== ""),
    [kbFields],
  );

  function addArtifact(a: ComposeArtifact) {
    setBlocks((bs) => [...bs, { id: newId(), title: a.label, body_md: a.body, sourceId: a.id }]);
  }
  function addKBField(e: { key: string; label: string; value: string }) {
    setBlocks((bs) => [
      ...bs,
      { id: newId(), title: e.label, body_md: e.value, sourceId: `kb:${e.key}` },
    ]);
  }
  function addEmpty() {
    setBlocks((bs) => [...bs, { id: newId(), title: "새 섹션", body_md: "" }]);
  }
  function update(id: string, patch: Partial<Block>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
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
  function onDrop(target: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === target) return;
    move(from, target);
  }

  const composed = React.useMemo(
    () => assembleDocumentMarkdown(blocks.map((b) => ({ title: b.title, body_md: b.body_md }))),
    [blocks],
  );

  async function save() {
    if (!title.trim()) {
      toast.error("문서 제목을 입력하세요.");
      return;
    }
    if (blocks.length === 0) {
      toast.error("섹션을 최소 한 개 추가하세요.");
      return;
    }
    setSaving(true);
    try {
      const r = await composeManualDocument({
        projectId,
        title: title.trim(),
        blocks: blocks.map((b) => ({ id: b.id, title: b.title, body_md: b.body_md })),
      });
      if (!r.ok) {
        toast.error(r.error.message ?? "저장에 실패했어요.");
        return;
      }
      toast.success("문서를 저장했어요.");
      router.push(`/p/${projectId}/documents/${r.data.documentId}`);
    } catch {
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={embedded ? "" : "mx-auto max-w-6xl px-6 py-8"}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        {!embedded && (
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">문서 직접 조립</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              도구에서 만든 결과를 골라 순서를 바꾸고 내용을 다듬어 문서로 만듭니다. AI 호출 없이 저장돼요.
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
            {preview ? <PencilIcon className="size-4" /> : <EyeIcon className="size-4" />}
            {preview ? "편집" : "미리보기"}
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            문서 저장
          </Button>
        </div>
      </header>

      <div className="mb-5">
        <Label htmlFor="doc-title">문서 제목</Label>
        <Input
          id="doc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: OOO 사업계획서"
          className="mt-1.5"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Palette — Knowledge Base fields + saved tool results to pull in */}
        <aside className="space-y-3">
          {kbEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Knowledge Base
              </p>
              <div className="space-y-2">
                {kbEntries.map((e) => (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => addKBField(e)}
                    className="w-full rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary"
                  >
                    <div className="flex items-center gap-1.5">
                      <DatabaseIcon className="size-3.5 shrink-0 text-sky-600 dark:text-sky-500" />
                      <span className="truncate text-sm font-medium">{e.label}</span>
                      {usedSources.has(`kb:${e.key}`) && (
                        <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px] font-normal">
                          추가됨
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {e.value.slice(0, 90)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              도구 결과 불러오기
            </p>
            <Button variant="ghost" size="sm" onClick={addEmpty} className="h-7 px-2 text-xs">
              <PlusIcon className="size-3.5" />
              빈 섹션
            </Button>
          </div>
          {artifacts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
              아직 저장된 도구 결과가 없어요. 도구를 실행해 결과를 만든 뒤 여기서 불러올 수 있어요.
              지금은 ‘빈 섹션’으로 직접 작성할 수 있어요.
            </p>
          ) : (
            <div className="space-y-2">
              {artifacts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => addArtifact(a)}
                  className="w-full rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{a.label}</span>
                    {a.verified && (
                      <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    )}
                    {usedSources.has(a.id) && (
                      <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px] font-normal">
                        추가됨
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {a.body.replace(/[#*`>]/g, "").trim().slice(0, 90) || "내용 없음"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Document — ordered, editable blocks (or preview) */}
        <section>
          {preview ? (
            <div className="rounded-xl border border-border bg-card p-6">
              {composed.trim() ? (
                <Markdown>{`# ${title || "제목 없음"}\n\n${composed}`}</Markdown>
              ) : (
                <p className="text-sm text-muted-foreground">미리볼 내용이 없어요.</p>
              )}
            </div>
          ) : blocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              왼쪽에서 도구 결과를 클릭해 추가하거나 ‘빈 섹션’으로 시작하세요.
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.map((b, i) => (
                <div
                  key={b.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => {
                        dragIndex.current = i;
                      }}
                      onDragEnd={() => {
                        dragIndex.current = null;
                      }}
                      className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      title="드래그해서 순서 변경"
                      aria-label="드래그 정렬"
                    >
                      <GripVerticalIcon className="size-4" />
                    </button>
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
                    className="mt-2 min-h-[140px] font-mono text-xs leading-relaxed"
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEmpty} className="w-full border-dashed">
                <PlusIcon className="size-4" />
                빈 섹션 추가
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
