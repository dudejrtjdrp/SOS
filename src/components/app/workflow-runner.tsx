"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PlayIcon,
  CheckIcon,
  Loader2Icon,
  XIcon,
  FileTextIcon,
  SparklesIcon,
  NetworkIcon,
  CopyIcon,
  ClipboardPasteIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildExternalPrompt, submitExternalResult } from "@/server/actions/module";
import { getGuide } from "@/core/modules/guide";
import { AI_ENABLED } from "@/lib/flags";

type Step = { key: string; label: string };
type ChipDef = {
  key: string;
  label: string;
  title: string;
  kind: "step" | "doc" | "memory";
};
export type Preset = {
  id: string;
  name: string;
  desc: string;
  /** Journey phase used to group presets in the UI. */
  phase: string;
  steps: Step[];
  /** Terminal document key. Omit for analysis-only (exploratory) pipelines. */
  doc?: string;
  docLabel?: string;
};

type ManualStep = {
  preset: Preset;
  index: number;
  moduleId: string;
  stepKey: string;
  label: string;
};

export function WorkflowRunner({
  projectId,
  presets,
  idMap,
}: {
  projectId: string;
  presets: Preset[];
  idMap: Record<string, string>;
}) {
  const router = useRouter();
  const [active, setActive] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Record<string, string>>({});
  const [manual, setManual] = React.useState<ManualStep | null>(null);
  const [pasteText, setPasteText] = React.useState("");
  const [copying, setCopying] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Run steps from startIndex. If a step's AI call fails, pause (return done:false)
  // and surface a manual paste panel; submitManual() resumes from the next step.
  async function runSteps(
    preset: Preset,
    startIndex: number,
    st0: Record<string, string>,
  ): Promise<{ done: boolean; st: Record<string, string> }> {
    const st = { ...st0 };
    for (let idx = startIndex; idx < preset.steps.length; idx++) {
      const step = preset.steps[idx];
      const id = idMap[step.key];
      const k = `${preset.id}:${step.key}`;
      if (!id) {
        st[k] = "skip";
        setStatus({ ...st });
        continue;
      }
      st[k] = "running";
      setStatus({ ...st });
      let okStep = false;
      // AI off: skip the LLM call and route every step through the same manual
      // copy-prompt → paste-result flow (pauses below). AI on: try the call,
      // fall back to manual only if it fails.
      if (AI_ENABLED) {
        try {
          const res = await fetch("/api/runs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ projectId, moduleId: id, inputs: {}, useRag: true }),
          });
          if (res.ok && res.body) {
            const r = res.body.getReader();
            while (true) {
              const { done } = await r.read();
              if (done) break;
            }
            okStep = true;
          }
        } catch {
          okStep = false;
        }
      }
      if (!okStep) {
        st[k] = "manual";
        setStatus({ ...st });
        setManual({ preset, index: idx, moduleId: id, stepKey: k, label: step.label });
        return { done: false, st };
      }
      st[k] = "done";
      setStatus({ ...st });
    }
    return { done: true, st };
  }

  async function runDoc(preset: Preset, st0: Record<string, string>) {
    const st = { ...st0 };
    // Analysis-only pipeline: no terminal document. Land on Project Memory.
    if (!preset.doc) {
      setActive(null);
      toast.success("분석 완료 — Project Memory에서 결과를 확인하세요.");
      router.push(`/p/${projectId}/memory`);
      return;
    }
    // AI off: don't attempt one-click generation. The step results are saved —
    // hand off to the manual composer to assemble the document without AI.
    if (!AI_ENABLED) {
      setActive(null);
      toast.success("분석 단계를 마쳤어요 — ‘직접 조립’에서 문서를 완성하세요.");
      router.push(`/p/${projectId}/documents/compose`);
      return;
    }
    const dk = `${preset.id}:doc`;
    st[dk] = "running";
    setStatus({ ...st });
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, docType: preset.doc, language: "ko" }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.documentId) {
        st[dk] = "done";
        setStatus({ ...st });
        toast.success("워크플로우 완료");
        router.push(`/p/${projectId}/documents/${j.documentId}`);
        return;
      }
      st[dk] = "error";
    } catch {
      st[dk] = "error";
    }
    setStatus({ ...st });
    setActive(null);
    // Document generation blocked — analysis is already saved; hand off to the
    // manual composer so the user can assemble the document without AI.
    toast.error("문서 생성이 막혔어요(한도·오류). 분석 결과는 저장됐어요 — 수동 조립으로 이어가세요.");
    router.push(`/p/${projectId}/documents/compose`);
  }

  async function start(preset: Preset) {
    setActive(preset.id);
    setManual(null);
    setPasteText("");
    const { done, st } = await runSteps(preset, 0, status);
    if (done) await runDoc(preset, st);
  }

  async function copyManualPrompt() {
    if (!manual) return;
    setCopying(true);
    try {
      const r = await buildExternalPrompt({ projectId, moduleId: manual.moduleId, inputs: {} });
      if (!r.ok) {
        toast.error(r.error.message ?? "프롬프트를 만들지 못했어요.");
        return;
      }
      await navigator.clipboard.writeText(r.data.prompt);
      toast.success("프롬프트를 복사했어요. 외부 AI에서 돌린 결과를 붙여넣으세요.");
    } catch {
      toast.error("복사에 실패했어요.");
    } finally {
      setCopying(false);
    }
  }

  async function submitManual() {
    if (!manual) return;
    if (!pasteText.trim()) {
      toast.error("결과를 붙여넣어 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await submitExternalResult({
        projectId,
        moduleId: manual.moduleId,
        inputs: {},
        text: pasteText,
      });
      if (!r.ok) {
        toast.error(r.error.message ?? "저장에 실패했어요.");
        return;
      }
      const st = { ...status, [manual.stepKey]: "external" };
      setStatus(st);
      toast.success("외부 결과를 저장했어요. 다음 단계로 이어갑니다.");
      const { preset, index } = manual;
      setManual(null);
      setPasteText("");
      const res = await runSteps(preset, index + 1, st);
      if (res.done) await runDoc(preset, res.st);
    } catch {
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  function cancelManual() {
    if (!manual) return;
    setStatus((s) => ({ ...s, [manual.stepKey]: "error" }));
    setManual(null);
    setPasteText("");
    setActive(null);
  }

  const phases = presets.reduce<string[]>(
    (acc, p) => (acc.includes(p.phase) ? acc : [...acc, p.phase]),
    [],
  );

  return (
    <div className="space-y-8">
      {manual && (
        <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-500" />
            {AI_ENABLED
              ? `‘${manual.label}’ 단계에서 AI 실행이 막혔어요 — 직접 돌려서 이어가기`
              : `‘${manual.label}’ 단계 — 외부 AI에서 실행해 이어가기`}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {AI_ENABLED
              ? "사용량 한도나 일시 오류일 수 있어요. ① 프롬프트 복사 → ② ChatGPT·Claude에서 실행 → ③ 결과를 아래에 붙여넣으면, 저장 후 다음 단계로 자동으로 이어집니다."
              : "① 프롬프트 복사 → ② ChatGPT·Claude에서 실행 → ③ 결과를 아래에 붙여넣으면, 저장 후 다음 단계로 자동으로 이어집니다."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyManualPrompt} disabled={copying}>
              <CopyIcon className="size-4" />
              프롬프트 복사
            </Button>
          </div>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="외부 AI가 생성한 결과를 붙여넣기"
            className="min-h-[160px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={submitManual} disabled={submitting}>
              {submitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ClipboardPasteIcon className="size-4" />
              )}
              결과 저장하고 계속
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelManual}>
              중단
            </Button>
          </div>
        </div>
      )}
      {phases.map((phase) => (
        <section key={phase} className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {phase}
          </h2>
          <div className="space-y-3">
            {presets
              .filter((p) => p.phase === phase)
              .map((p) => {
                const chips: ChipDef[] = [
                  ...p.steps.map((s) => ({
                    key: `${p.id}:${s.key}`,
                    label: s.label,
                    title: getGuide(s.key).tagline || s.label,
                    kind: "step" as const,
                  })),
                  p.doc
                    ? {
                        key: `${p.id}:doc`,
                        label: p.docLabel ?? "문서",
                        title: `최종 결과물: ${p.docLabel ?? "문서"} 생성`,
                        kind: "doc" as const,
                      }
                    : {
                        key: `${p.id}:memory`,
                        label: "Project Memory",
                        title: "분석 결과가 Project Memory에 누적됩니다",
                        kind: "memory" as const,
                      },
                ];
                return (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          <Badge doc={!!p.doc} count={p.steps.length} />
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{p.desc}</div>
                      </div>
                      <Button size="sm" onClick={() => start(p)} disabled={active !== null}>
                        {active === p.id ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <PlayIcon className="size-4" />
                        )}
                        실행
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {chips.map((s, i) => (
                        <React.Fragment key={s.key}>
                          <StepChip label={s.label} title={s.title} state={status[s.key]} kind={s.kind} />
                          {i < chips.length - 1 && <span className="text-muted-foreground">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Badge({ doc, count }: { doc: boolean; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {doc ? <FileTextIcon className="size-2.5" /> : <SparklesIcon className="size-2.5" />}
      {count}단계 · {doc ? "문서" : "분석"}
    </span>
  );
}

function StepChip({
  label,
  title,
  state,
  kind = "step",
}: {
  label: string;
  title?: string;
  state?: string;
  kind?: "step" | "doc" | "memory";
}) {
  const terminal = kind !== "step";
  const icon =
    state === "done" ? (
      <CheckIcon className="size-3 text-[var(--success)]" />
    ) : state === "running" ? (
      <Loader2Icon className="size-3 animate-spin" />
    ) : state === "error" ? (
      <XIcon className="size-3 text-[var(--danger)]" />
    ) : state === "manual" ? (
      <TriangleAlertIcon className="size-3 text-amber-600 dark:text-amber-500" />
    ) : state === "external" ? (
      <CheckIcon className="size-3 text-sky-600 dark:text-sky-400" />
    ) : kind === "doc" ? (
      <FileTextIcon className="size-3 text-muted-foreground" />
    ) : kind === "memory" ? (
      <NetworkIcon className="size-3 text-muted-foreground" />
    ) : null;
  return (
    <span
      title={state === "external" ? `${title ?? label} · 외부 결과로 완료` : title}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
        state === "done"
          ? "border-[var(--success)]/40 text-foreground"
          : state === "running"
            ? "border-primary/40 text-foreground"
            : state === "manual"
              ? "border-amber-500/50 bg-amber-500/10 text-foreground"
              : state === "external"
                ? "border-sky-500/40 bg-sky-500/10 text-foreground"
                : terminal
                  ? "border-border bg-muted/40 text-foreground"
                  : "border-border text-muted-foreground"
      }`}
    >
      {icon}
      {label}
      {state === "external" && (
        <span className="text-[9px] font-medium text-sky-700 dark:text-sky-400">외부</span>
      )}
    </span>
  );
}
