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
  FileTextIcon,
  PencilLineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DocumentComposer } from "@/components/app/document-composer";
import { buildComposePrompt, buildOrganizePrompt } from "@/server/actions/compose";
import { buildExternalPrompt } from "@/server/actions/module";
import { composeManualDocument } from "@/server/actions/document";
import type { ComposeArtifact } from "@/lib/queries";

interface DocTemplate {
  key: string;
  name: string;
  sections: { key: string; title: string; instruction: string; moduleKey: string | null }[];
}

type DocSectionView = DocTemplate["sections"][number];

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
          key={doc.key}
          projectId={projectId}
          doc={doc}
          idMap={idMap}
          artifacts={artifacts}
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
  artifacts,
}: {
  projectId: string;
  doc: DocTemplate;
  idMap: Record<string, string>;
  artifacts: ComposeArtifact[];
}) {
  const router = useRouter();
  const [copying, setCopying] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  // Per-section body text, keyed by the section's stable key.
  const [bodies, setBodies] = React.useState<Record<string, string>>({});
  const setBody = (k: string, v: string) => setBodies((p) => ({ ...p, [k]: v }));

  // Latest saved artifact per module key — used to prefill tool-backed sections.
  const artifactByKey = React.useMemo(() => {
    const m = new Map<string, ComposeArtifact>();
    for (const a of artifacts) {
      if (a.moduleKey && !m.has(a.moduleKey)) m.set(a.moduleKey, a);
    }
    return m;
  }, [artifacts]);

  const withTool = doc.sections.filter((s) => s.moduleKey);
  const ready = withTool.filter((s) => artifactByKey.has(s.moduleKey as string)).length;
  const filledCount = doc.sections.filter((s) => (bodies[s.key] ?? "").trim()).length;
  const hasFillable = withTool.some((s) => artifactByKey.has(s.moduleKey as string));

  function fillFromTool(sec: DocSectionView) {
    const a = sec.moduleKey ? artifactByKey.get(sec.moduleKey) : undefined;
    if (!a) return;
    setBody(sec.key, a.body);
    toast.success(`‘${sec.title}’에 도구 결과를 채웠어요.`);
  }

  function fillAllFromTools() {
    let n = 0;
    setBodies((prev) => {
      const next = { ...prev };
      for (const s of doc.sections) {
        if (!s.moduleKey || (next[s.key] ?? "").trim()) continue;
        const a = artifactByKey.get(s.moduleKey);
        if (a) {
          next[s.key] = a.body;
          n++;
        }
      }
      return next;
    });
    if (n === 0) toast.info("새로 채울 도구 결과가 없어요.");
    else toast.success(`${n}개 섹션을 도구 결과로 채웠어요.`);
  }

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

  async function saveAssembled() {
    const blocks = doc.sections
      .map((s) => ({ title: s.title, body_md: (bodies[s.key] ?? "").trim() }))
      .filter((b) => b.body_md);
    if (blocks.length === 0) {
      return toast.error("작성된 섹션이 없어요. 각 항목을 직접 작성하거나 도구 결과를 채워 주세요.");
    }
    setSaving(true);
    try {
      const r = await composeManualDocument({ projectId, title: doc.name, blocks });
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
      {/* Doc header + actions */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
        <FileTextIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{doc.name}</span>
        <span className="text-xs text-muted-foreground">
          항목 {doc.sections.length}개 · 작성 {filledCount}/{doc.sections.length}
          {withTool.length > 0 ? ` · 도구 결과 ${ready}/${withTool.length}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {hasFillable && (
            <Button variant="outline" size="sm" onClick={fillAllFromTools}>
              <WandSparklesIcon className="size-4" />
              도구 결과 모두 채우기
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={copyDocPrompt} disabled={copying}>
            {copying ? <Loader2Icon className="size-4 animate-spin" /> : <CopyIcon className="size-4" />}
            문서 프롬프트 복사
          </Button>
        </div>
      </div>

      {/* Section editor — each item is described and directly writable */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          이 문서를 구성하는 항목
        </p>
        <div className="space-y-3">
          {doc.sections.map((s, i) => {
            const mk = s.moduleKey;
            const artifact = mk ? artifactByKey.get(mk) : undefined;
            const moduleId = mk ? idMap[mk] : undefined;
            const filled = (bodies[s.key] ?? "").trim().length > 0;
            return (
              <div key={s.key} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">{s.title}</span>
                  {mk === null ? (
                    <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                      <PencilLineIcon className="size-3" />
                      직접 작성
                    </Badge>
                  ) : artifact ? (
                    <Badge className="h-5 gap-1 border-transparent bg-emerald-500/10 px-1.5 text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2Icon className="size-3" />
                      도구 결과 있음
                    </Badge>
                  ) : (
                    <Badge className="h-5 gap-1 border-transparent bg-amber-500/10 px-1.5 text-[10px] font-normal text-amber-700 dark:text-amber-400">
                      <CircleDashedIcon className="size-3" />
                      결과 없음
                    </Badge>
                  )}
                  {filled && (
                    <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-500" />
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    {artifact && (
                      <button
                        type="button"
                        onClick={() => fillFromTool(s)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        title="저장된 도구 결과를 이 칸에 채우기"
                      >
                        <WandSparklesIcon className="size-3.5" />
                        결과 채우기
                      </button>
                    )}
                    {moduleId && <ToolPromptButton projectId={projectId} moduleId={moduleId} />}
                    {moduleId && (
                      <Link
                        href={`/p/${projectId}/run/${moduleId}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        도구 열기
                      </Link>
                    )}
                  </span>
                </div>

                {/* What to write — guidance pulled from the template */}
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.instruction}</p>

                {/* The actual writing field */}
                <Textarea
                  value={bodies[s.key] ?? ""}
                  onChange={(e) => setBody(s.key, e.target.value)}
                  placeholder={
                    mk === null
                      ? `여기에 직접 작성하세요 — ${s.instruction}`
                      : artifact
                        ? "‘결과 채우기’로 도구 결과를 가져오거나 직접 작성하세요."
                        : "도구를 실행해 결과를 만들거나 직접 작성하세요."
                  }
                  className="mt-2 min-h-[120px] text-sm leading-relaxed"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Assemble + save */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          작성한 섹션을 모아 하나의 문서로 저장해요. 비어 있는 섹션은 제외됩니다. AI 호출 없이 저장돼요.
        </p>
        <Button size="sm" onClick={saveAssembled} disabled={saving}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          문서로 저장 ({filledCount}/{doc.sections.length})
        </Button>
      </div>

      {/* Alternative — paste a whole external-AI result in one go */}
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">
          또는 — 외부 AI 전체 결과를 한 번에 붙여넣기
        </summary>
        <PasteWholeDoc projectId={projectId} docName={doc.name} />
      </details>
    </div>
  );
}

function PasteWholeDoc({ projectId, docName }: { projectId: string; docName: string }) {
  const router = useRouter();
  const [paste, setPaste] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function savePasted() {
    if (!paste.trim()) return toast.error("외부 AI 결과를 붙여넣어 주세요.");
    setSaving(true);
    try {
      const r = await composeManualDocument({
        projectId,
        title: docName,
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
    <div className="mt-3">
      <p className="text-xs text-muted-foreground">
        '문서 프롬프트 복사'로 받은 프롬프트를 외부 AI에서 실행한 결과(마크다운)를 통째로 붙여넣어 저장해요.
      </p>
      <Textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder="외부 AI가 작성한 문서 본문 전체를 붙여넣기"
        className="mt-2 min-h-[160px]"
      />
      <div className="mt-2 flex justify-end">
        <Button variant="outline" size="sm" onClick={savePasted} disabled={saving}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          붙여넣은 결과로 저장
        </Button>
      </div>
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
