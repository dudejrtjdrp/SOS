"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ChevronDownIcon,
  PinIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  Loader2Icon,
} from "lucide-react";
import type { VerificationStatus } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import { deleteArtifact, saveArtifactViz, updateArtifact } from "@/server/actions/artifact";
import { getViz, type VizDef } from "@/core/viz/registry";
import { StructuredResult } from "./structured-result";
import { Viz, type PosLayout } from "./viz";

export interface SavedArtifact {
  id: string;
  /** Structured output (jsonb) — object, or `{ markdown }`, or null. */
  content: unknown;
  contentMd: string | null;
  status: VerificationStatus;
  founderTake: string | null;
  createdAt: string;
  pinned: boolean;
}

const CHIP: Record<VerificationStatus, { label: string; cls: string }> = {
  ai_draft: { label: "AI 초안", cls: "bg-muted text-muted-foreground" },
  needs_review: {
    label: "검토 필요",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  human_verified: {
    label: "검증 완료",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  rejected: { label: "반려됨", cls: "bg-[var(--danger)]/10 text-[var(--danger)]" },
};

/** Structured object suitable for the viz/structured renderer, or null. */
function structuredOf(a: SavedArtifact): Record<string, unknown> | null {
  const c = a.content;
  if (c && typeof c === "object" && !Array.isArray(c) && !("markdown" in c)) {
    return c as Record<string, unknown>;
  }
  return null;
}

function markdownOf(a: SavedArtifact): string {
  if (a.contentMd && a.contentMd.trim()) return a.contentMd;
  const c = a.content;
  if (c && typeof c === "object" && "markdown" in c) {
    return String((c as Record<string, unknown>).markdown ?? "");
  }
  return "";
}

/** Heuristic: content_md that is actually serialized JSON, not a readable doc. */
function looksLikeJson(s: string): boolean {
  return /^\s*[{[]/.test(s);
}

/**
 * Past results for a tool, each expandable to its full view. Structured results
 * for viz-capable tools reuse the same 시각화/원본 toggle as the live runner, so
 * a saved SWOT/Porter/AARRR/etc. renders as its diagram, not just text.
 */
export function SavedResults({
  moduleKey,
  items,
  onChange,
  highlightId,
}: {
  moduleKey: string | null;
  items: SavedArtifact[];
  /** Lift edits/deletes to the parent so the list stays in sync. Omit for read-only. */
  onChange?: (next: SavedArtifact[]) => void;
  /** Auto-expand this card when it changes (e.g. a just-pasted result). */
  highlightId?: string | null;
}) {
  const vizDefs = React.useMemo(() => getViz(moduleKey), [moduleKey]);
  const [openId, setOpenId] = React.useState<string | null>(items[0]?.id ?? null);

  React.useEffect(() => {
    if (highlightId) setOpenId(highlightId);
  }, [highlightId]);

  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">저장된 결과</h2>
        <Badge variant="secondary" className="text-[10px]">
          {items.length}개
        </Badge>
        {vizDefs.length > 0 && (
          <Badge variant="outline" className="text-[10px] text-primary">
            시각화 지원
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {items.map((a) => (
          <SavedCard
            key={a.id}
            artifact={a}
            vizDefs={vizDefs}
            open={openId === a.id}
            onToggle={() => setOpenId((id) => (id === a.id ? null : a.id))}
            onUpdated={
              onChange ? (u) => onChange(items.map((it) => (it.id === u.id ? u : it))) : undefined
            }
            onDeleted={
              onChange
                ? (id) => {
                    onChange(items.filter((it) => it.id !== id));
                    setOpenId((cur) => (cur === id ? null : cur));
                  }
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}

function SavedCard({
  artifact,
  vizDefs,
  open,
  onToggle,
  onUpdated,
  onDeleted,
}: {
  artifact: SavedArtifact;
  vizDefs: VizDef[];
  open: boolean;
  onToggle: () => void;
  onUpdated?: (next: SavedArtifact) => void;
  onDeleted?: (id: string) => void;
}) {
  const structured = structuredOf(artifact);
  const md = markdownOf(artifact);
  const docMd = md && !looksLikeJson(md) ? md : null;
  const canViz = !!structured && vizDefs.length > 0;
  const [vizMode, setVizMode] = React.useState(true);
  const [vizIdx, setVizIdx] = React.useState(0);
  const [layouts, setLayouts] = React.useState<Record<string, PosLayout>>(() => {
    const v = structured?.__viz;
    return v && typeof v === "object" ? (v as Record<string, PosLayout>) : {};
  });
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const chip = CHIP[artifact.status];

  function onLayout(templateId: string, layout: PosLayout) {
    setLayouts((s) => ({ ...s, [templateId]: layout }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveArtifactViz({ artifactId: artifact.id, templateId, layout });
    }, 600);
  }

  // ── Inline edit / delete ──────────────────────────────────────────
  const [editing, setEditing] = React.useState(false);
  const [draftJson, setDraftJson] = React.useState("");
  const [draftMd, setDraftMd] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const canEdit = !!onUpdated;
  const canDelete = !!onDeleted;

  function startEdit() {
    if (structured) {
      // Hide the internal viz-layout key from the editable JSON.
      const rest: Record<string, unknown> = { ...structured };
      delete rest.__viz;
      setDraftJson(JSON.stringify(rest, null, 2));
      setDraftMd(docMd ?? "");
    } else {
      setDraftMd(md);
    }
    setConfirmDel(false);
    setEditing(true);
  }

  async function saveEdit() {
    setBusy(true);
    try {
      if (structured) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(draftJson);
        } catch {
          toast.error("JSON 형식이 올바르지 않아요. 다시 확인해 주세요.");
          return;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          toast.error("JSON 객체 형태여야 해요.");
          return;
        }
        const obj = parsed as Record<string, unknown>;
        // Only touch content_md when this card actually had a document body.
        const nextMd = docMd != null ? (draftMd.trim() ? draftMd : null) : undefined;
        const r = await updateArtifact({ artifactId: artifact.id, content: obj, contentMd: nextMd });
        if (!r.ok) {
          toast.error(r.error.message ?? "수정에 실패했어요.");
          return;
        }
        const prevViz =
          artifact.content && typeof artifact.content === "object" && !Array.isArray(artifact.content)
            ? (artifact.content as Record<string, unknown>).__viz
            : undefined;
        const merged = prevViz !== undefined ? { ...obj, __viz: prevViz } : obj;
        onUpdated?.({
          ...artifact,
          content: merged,
          contentMd: nextMd === undefined ? artifact.contentMd : nextMd,
        });
      } else {
        const text = draftMd;
        const r = await updateArtifact({
          artifactId: artifact.id,
          content: { markdown: text },
          contentMd: text,
        });
        if (!r.ok) {
          toast.error(r.error.message ?? "수정에 실패했어요.");
          return;
        }
        onUpdated?.({ ...artifact, content: { markdown: text }, contentMd: text });
      }
      toast.success("수정했어요.");
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      const r = await deleteArtifact({ artifactId: artifact.id });
      if (!r.ok) {
        toast.error(r.error.message ?? "삭제에 실패했어요.");
        return;
      }
      toast.success("삭제했어요.");
      onDeleted?.(artifact.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <Badge className={`${chip.cls} shrink-0 text-[10px]`}>{chip.label}</Badge>
        {artifact.pinned && <PinIcon className="size-3.5 shrink-0 text-primary" />}
        <span className="flex-1 truncate text-sm">
          {new Date(artifact.createdAt).toLocaleString("ko-KR", {
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {editing ? (
            <div className="space-y-3">
              {structured ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      데이터 (JSON)
                    </label>
                    <Textarea
                      value={draftJson}
                      onChange={(e) => setDraftJson(e.target.value)}
                      className="min-h-[220px] font-mono text-xs"
                      spellCheck={false}
                    />
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      JSON 형식을 유지하세요. 도식이 이 데이터로 다시 그려집니다.
                    </p>
                  </div>
                  {docMd != null && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        문서 본문 <span className="font-normal">· 선택</span>
                      </label>
                      <Textarea
                        value={draftMd}
                        onChange={(e) => setDraftMd(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                  )}
                </>
              ) : (
                <Textarea
                  value={draftMd}
                  onChange={(e) => setDraftMd(e.target.value)}
                  className="min-h-[220px]"
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={busy}>
                  {busy ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckIcon className="size-4" />
                  )}
                  저장
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
          {canViz ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setVizMode(true)}
                    className={`rounded px-2 py-1 ${vizMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    시각화
                  </button>
                  <button
                    type="button"
                    onClick={() => setVizMode(false)}
                    className={`rounded px-2 py-1 ${!vizMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {docMd ? "문서" : "원본"}
                  </button>
                </div>
                {vizMode && vizDefs.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {vizDefs.map((d, idx) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setVizIdx(idx)}
                        className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                          idx === vizIdx
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {vizMode ? (
                <Viz
                  key={vizDefs[vizIdx]?.id}
                  model={vizDefs[vizIdx]?.build(structured!) ?? null}
                  layout={vizDefs[vizIdx] ? layouts[vizDefs[vizIdx].id] : undefined}
                  onChange={(l) => {
                    const def = vizDefs[vizIdx];
                    if (def) onLayout(def.id, l);
                  }}
                />
              ) : docMd ? (
                <Markdown>{docMd}</Markdown>
              ) : (
                <StructuredResult content={structured} />
              )}
            </div>
          ) : structured ? (
            <StructuredResult content={structured} />
          ) : (
            <Markdown>{md}</Markdown>
          )}

          {artifact.founderTake && (
            <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/70">내 판단 — </span>
              {artifact.founderTake}
            </p>
          )}

          {(canEdit || canDelete) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={startEdit}>
                  <PencilIcon className="size-4" />
                  수정
                </Button>
              )}
              {canDelete &&
                (confirmDel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">삭제할까요?</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={doDelete}
                      disabled={busy}
                      className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                    >
                      {busy ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <Trash2Icon className="size-4" />
                      )}
                      삭제
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDel(false)}
                      disabled={busy}
                    >
                      취소
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDel(true)}
                    className="text-muted-foreground"
                  >
                    <Trash2Icon className="size-4" />
                    삭제
                  </Button>
                ))}
            </div>
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
