"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CopyIcon,
  Loader2Icon,
  SaveIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  WandSparklesIcon,
  ArrowRightIcon,
  FileTextIcon,
  PencilLineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DocumentComposer } from "@/components/app/document-composer";
import { buildComposePrompt, buildOrganizePrompt } from "@/server/actions/compose";
import { buildExternalPrompt } from "@/server/actions/module";
import { composeManualDocument } from "@/server/actions/document";
import type { ComposeArtifact } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface DocTemplate {
  key: string;
  name: string;
  sections: { title: string; moduleKey: string | null }[];
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ComposeWorkspace({
  projectId,
  artifacts,
  docTemplates,
  idMap,
  initialDoc,
}: {
  projectId: string;
  artifacts: ComposeArtifact[];
  docTemplates: DocTemplate[];
  idMap: Record<string, string>;
  initialDoc: string | null;
}) {
  const validInitial = initialDoc && docTemplates.some((d) => d.key === initialDoc) ? initialDoc : null;
  const [target, setTarget] = React.useState<string>(validInitial ?? "");

  const artifactKeys = React.useMemo(
    () => new Set(artifacts.map((a) => a.moduleKey).filter(Boolean) as string[]),
    [artifacts],
  );

  const doc = docTemplates.find((d) => d.key === target) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">문서 직접 조립</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          만들 문서를 고르면, 도구로 도출한 결과가 들어간 프롬프트를 드려요. 외부 AI에 붙여넣어 받은 결과를
          저장하면 문서가 됩니다. 템플릿 없이 수동으로 조립할 수도 있어요.
        </p>
      </header>

      {/* Step 1 — pick a target */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <label className="text-sm font-medium">만들 문서</label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">선택하세요…</option>
          <optgroup label="문서 종류 (워크플로우 산출물)">
            {docTemplates.map((d) => (
              <option key={d.key} value={d.key}>
                {d.name}
              </option>
            ))}
          </optgroup>
          <option value="__manual__">수동 조립 (템플릿 없음)</option>
        </select>
      </div>

      {target === "" ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          위에서 만들 문서를 선택하세요. 워크플로우 산출물(사업계획서·IR Deck·PRD 등) 또는 ‘수동 조립’을 고를 수 있어요.
        </div>
      ) : target === "__manual__" ? (
        <ManualPanel projectId={projectId} artifacts={artifacts} />
      ) : doc ? (
        <WorkflowPanel
          projectId={projectId}
          doc={doc}
          idMap={idMap}
          artifactKeys={artifactKeys}
        />
      ) : null}
    </div>
  );
}

/* ── Workflow/doc target ─────────────────────────────────────────── */
function WorkflowPanel({
  projectId,
  doc,
  idMap,
  artifactKeys,
}: {
  projectId: string;
  doc: DocTemplate;
  idMap: Record<string, string>;
  artifactKeys: Set<string>;
}) {
  const router = useRouter();
  const [copying, setCopying] = React.useState(false);
  const [paste, setPaste] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const withTool = doc.sections.filter((s) => s.moduleKey);
  const missing = withTool.filter((s) => !artifactKeys.has(s.moduleKey as string));

  async function copyDocPrompt() {
    setCopying(true);
    try {
      const r = await buildComposePrompt({ projectId, docType: doc.key });
      if (!r.ok) return toast.error(r.error.message ?? "프롬프트를 만들지 못했어요.");
      await copy(r.data.prompt);
      toast.success("문서 프롬프트를 복사했어요. 외부 AI에 붙여넣어 실행하세요.");
    } catch {
      toast.error("복사에 실패했어요.");
    } finally {
      setCopying(false);
    }
  }

  async function savePasted() {
    if (!paste.trim()) return toast.error("외부 AI 결과를 붙여넣어 주세요.");
    setSaving(true);
    try {
      const r = await composeManualDocument({
        projectId,
        title: doc.name,
        blocks: [{ title: "본문", body_md: paste.trim() }],
      });
      if (!r.ok) return toast.error(r.error.message ?? "저장에 실패했어요.");
      toast.success("문서를 저장했어요.");
      router.push(`/p/${projectId}/documents/${r.data.documentId}`);
    } catch {
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
        <FileTextIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{doc.name}</span>
        <span className="text-xs text-muted-foreground">
          항목 {withTool.length}개 · 결과 준비 {withTool.length - missing.length}/{withTool.length}
        </span>
        <Button size="sm" className="ml-auto" onClick={copyDocPrompt} disabled={copying}>
          {copying ? <Loader2Icon className="size-4 animate-spin" /> : <WandSparklesIcon className="size-4" />}
          문서 프롬프트 복사
        </Button>
      </div>

      {/* Items / sections */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          이 문서를 구성하는 항목
        </p>
        <ul className="space-y-1.5">
          {doc.sections.map((s, i) => {
            const mk = s.moduleKey;
            const covered = mk ? artifactKeys.has(mk) : null;
            const moduleId = mk ? idMap[mk] : undefined;
            return (
              <li
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                {covered === true ? (
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                ) : covered === false ? (
                  <CircleDashedIcon className="size-4 shrink-0 text-amber-500" />
                ) : (
                  <PencilLineIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm">{s.title}</span>
                {covered === false && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                    결과 없음
                  </span>
                )}
                {mk === null && (
                  <span className="text-[10px] text-muted-foreground">직접 작성</span>
                )}
                {moduleId && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <ToolPromptButton projectId={projectId} moduleId={moduleId} />
                    <Link
                      href={`/p/${projectId}/run/${moduleId}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      도구 열기
                    </Link>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Paste back → save */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">결과 붙여넣어 문서로 저장</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          복사한 프롬프트를 외부 AI에서 실행한 결과(마크다운)를 붙여넣고 저장하면 문서가 만들어져요.
        </p>
        <Textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="외부 AI가 작성한 문서 본문을 붙여넣기"
          className="mt-2 min-h-[160px]"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={savePasted} disabled={saving}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            문서로 저장
          </Button>
        </div>
      </div>

      {/* Missing items */}
      {missing.length > 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            빠진 항목이 {missing.length}개 있어요
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            아래 도구의 결과가 아직 없어요. 먼저 실행해 두면 문서 품질이 올라가요.
          </p>
          <ul className="mt-2 space-y-1.5">
            {missing.map((s, i) => {
              const moduleId = idMap[s.moduleKey as string];
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CircleDashedIcon className="size-4 shrink-0 text-amber-500" />
                  <span>{s.title}</span>
                  {moduleId && (
                    <Link
                      href={`/p/${projectId}/run/${moduleId}`}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      도구 실행 <ArrowRightIcon className="size-3.5" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--success)]/40 bg-[var(--success)]/5 px-4 py-3 text-sm">
          <CheckCircle2Icon className="mr-1.5 inline size-4 text-emerald-600 dark:text-emerald-500" />
          모든 항목의 도구 결과가 준비됐어요.
        </div>
      )}
    </div>
  );
}

function ToolPromptButton({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const [loading, setLoading] = React.useState(false);
  async function go() {
    setLoading(true);
    try {
      const r = await buildExternalPrompt({ projectId, moduleId, inputs: {} });
      if (!r.ok) return toast.error(r.error.message ?? "프롬프트를 만들지 못했어요.");
      await copy(r.data.prompt);
      toast.success("도구 프롬프트를 복사했어요.");
    } catch {
      toast.error("복사에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      title="이 항목을 만드는 도구 프롬프트 복사"
    >
      {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <CopyIcon className="size-3.5" />}
      프롬프트
    </button>
  );
}

/* ── Manual (no template) ────────────────────────────────────────── */
function ManualPanel({
  projectId,
  artifacts,
}: {
  projectId: string;
  artifacts: ComposeArtifact[];
}) {
  const [copying, setCopying] = React.useState(false);

  async function copyOrganize() {
    setCopying(true);
    try {
      const r = await buildOrganizePrompt({ projectId });
      if (!r.ok) return toast.error(r.error.message ?? "프롬프트를 만들지 못했어요.");
      await copy(r.data.prompt);
      toast.success("정리 프롬프트를 복사했어요. 외부 AI에 붙여넣어 실행하세요.");
    } catch {
      toast.error("복사에 실패했어요.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <WandSparklesIcon className="size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">저장된 도구 결과를 한 문서로 정리</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            템플릿 없이, 지금까지의 결과를 깔끔하게 정리하는 프롬프트예요. 결과를 받아 아래에서 직접 조립·저장하세요.
          </p>
        </div>
        <Button size="sm" onClick={copyOrganize} disabled={copying}>
          {copying ? <Loader2Icon className="size-4 animate-spin" /> : <CopyIcon className="size-4" />}
          정리 프롬프트 복사
        </Button>
      </div>

      {/* Reuse the existing hand-assembly composer (pick → reorder → edit → save). */}
      <DocumentComposer projectId={projectId} artifacts={artifacts} embedded />
    </div>
  );
}
