"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  PlayIcon,
  Loader2Icon,
  TriangleAlertIcon,
  CopyIcon,
  ClipboardPasteIcon,
  CheckIcon,
} from "lucide-react";
import type { Variable } from "@/core/schemas/variables";
import type { VerificationStatus } from "@/types/db";
import { createClient } from "@/lib/supabase/client";
import { saveArtifactViz, verifyArtifact } from "@/server/actions/artifact";
import { buildExternalPrompt, submitExternalResult, submitStructuredResult } from "@/server/actions/module";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { getViz } from "@/core/viz/registry";
import { getGuide, SETTING_KEYS } from "@/core/modules/guide";
import { AI_ENABLED } from "@/lib/flags";
import { VizSkeleton } from "../skeletons";
import type { PosLayout } from "../viz";
import { SavedResults, type SavedArtifact } from "../saved-results";
import { EditPromptButton } from "../edit-prompt-button";

import type { Source, Status } from "./types";
import { splitDocAndJson } from "./extract-json";
import { Field } from "./field";
import { GuideCard } from "./guide-card";
import { ResultView, RunningSkeleton } from "./result-view";
import { DecisionGate } from "./decision-gate";
import { SecondaryActions } from "./secondary-actions";

/** SETTING_KEYS as a Set for O(1) membership — the input partition runs on every
 *  render, so this avoids an Array.includes scan per variable. */
const SETTING_KEY_SET = new Set<string>(SETTING_KEYS);

export function ModuleRunner({
  projectId,
  moduleId,
  moduleKey,
  moduleName,
  description,
  variables,
  outputKind,
  kb,
  saved = [],
  initialValues,
}: {
  projectId: string;
  moduleId: string;
  moduleKey: string | null;
  moduleName: string;
  description: string | null;
  variables: Variable[];
  outputKind: string;
  kb: Record<string, string>;
  saved?: SavedArtifact[];
  /** Per-key prefill (e.g. from URL query params) — wins over KB/defaults. */
  initialValues?: Record<string, string>;
}) {
  const initial = React.useMemo(() => {
    const o: Record<string, unknown> = {};
    for (const v of variables) {
      const override = initialValues?.[v.key];
      const fromKB = v.source?.startsWith("kb:") ? kb[v.source.slice(3)] : undefined;
      o[v.key] =
        (override != null && override !== "" ? override : undefined) ??
        fromKB ??
        v.default ??
        (v.type === "multiselect" ? [] : v.type === "slider" ? v.min ?? 1 : "");
    }
    return o;
  }, [variables, kb, initialValues]);

  // ── run / stream ──
  const [inputs, setInputs] = React.useState<Record<string, unknown>>(initial);
  const [status, setStatus] = React.useState<Status>("idle");
  const [streamText, setStreamText] = React.useState("");
  const [result, setResult] = React.useState<unknown>(null);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [docMd, setDocMd] = React.useState<string | null>(null);

  // ── artifact / decision gate ──
  const [artifactId, setArtifactId] = React.useState<string | null>(null);
  const [verification, setVerification] = React.useState<VerificationStatus>("ai_draft");
  const [take, setTake] = React.useState("");
  const [lastRunId, setLastRunId] = React.useState<string | null>(null);
  const [resolveError, setResolveError] = React.useState<null | "failed" | "timeout">(null);

  // ── visualization view ──
  const [vizMode, setVizMode] = React.useState(true);
  const [vizIdx, setVizIdx] = React.useState(0);
  const [vizLayouts, setVizLayouts] = React.useState<Record<string, PosLayout>>({});
  const vizSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── external-AI fallback (copy prompt / paste result) ──
  const [copying, setCopying] = React.useState(false);
  const [showPaste, setShowPaste] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // ── saved results ──
  const [savedItems, setSavedItems] = React.useState<SavedArtifact[]>(saved);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  // Guards async setState after the component unmounts (the artifact poller below
  // can run for ~20s) and clears the debounced viz-save timer so neither leaks.
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (vizSaveTimer.current) clearTimeout(vizSaveTimer.current);
    };
  }, []);

  const setVal = React.useCallback(
    (k: string, v: unknown) => setInputs((s) => ({ ...s, [k]: v })),
    [],
  );

  // Per-module data: recompute only when the module/variables change — not on every
  // keystroke (each input edit re-renders this component).
  const guide = React.useMemo(() => getGuide(moduleKey), [moduleKey]);
  const vizDefs = React.useMemo(() => getViz(moduleKey), [moduleKey]);
  const { contentVars, settingVars } = React.useMemo(() => {
    const content: Variable[] = [];
    const setting: Variable[] = [];
    for (const v of variables) {
      if (SETTING_KEY_SET.has(v.key)) setting.push(v);
      else content.push(v);
    }
    return { contentVars: content, settingVars: setting };
  }, [variables]);

  const resolveArtifact = React.useCallback(async (runId: string) => {
    const supabase = createClient();
    // The artifact is written in the run's onFinish — slightly after the stream
    // closes — so poll with backoff (~20s total). Stop early if the run is marked
    // failed (rate limit / provider error) so we can offer recovery instead of
    // leaving the gate hanging with disabled buttons.
    const delays = [300, 500, 800, 1000, 1500, 2000, 2500, 3000, 3000, 3000, 3000];
    for (let i = 0; i < delays.length; i++) {
      const { data: art } = await supabase
        .from("artifacts")
        .select("id, verification_status, founder_take")
        .eq("run_id", runId)
        .maybeSingle();
      if (!mounted.current) return;
      if (art?.id) {
        setArtifactId(art.id);
        setVerification((art.verification_status as VerificationStatus) ?? "ai_draft");
        if (typeof art.founder_take === "string") setTake(art.founder_take);
        return;
      }
      const { data: runRow } = await supabase
        .from("runs")
        .select("status")
        .eq("id", runId)
        .maybeSingle();
      if (!mounted.current) return;
      if (runRow?.status === "failed") {
        setResolveError("failed");
        return;
      }
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    if (!mounted.current) return;
    setResolveError("timeout");
  }, []);

  async function run() {
    setStatus("running");
    setStreamText("");
    setResult(null);
    setDocMd(null);
    setArtifactId(null);
    setSources([]);
    setVerification("ai_draft");
    setTake("");
    setResolveError(null);

    let res: Response;
    try {
      res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, moduleId, inputs, useRag: true }),
      });
    } catch {
      setStatus("error");
      toast.error("네트워크 오류가 발생했습니다.");
      return;
    }
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => null);
      setStatus("error");
      toast.error(j?.error?.message ?? "실행에 실패했습니다.");
      return;
    }

    const runId = res.headers.get("x-run-id");
    try {
      setSources(JSON.parse(decodeURIComponent(res.headers.get("x-sources") || "[]")));
    } catch {
      /* ignore */
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      if (outputKind !== "structured" && mounted.current) setStreamText(acc);
    }
    if (!mounted.current) return;

    if (outputKind === "structured") {
      try {
        setResult(JSON.parse(acc));
      } catch {
        setResult({ markdown: acc });
      }
    } else {
      setResult({ markdown: acc });
    }
    setStatus("done");
    setLastRunId(runId);
    if (runId) void resolveArtifact(runId);
    else setResolveError("timeout");
  }

  // Copy the exact prompt (role + task + KB-merged inputs + output spec) so the
  // user can reproduce this tool's result in an external AI (ChatGPT/Claude).
  async function copyPrompt() {
    setCopying(true);
    try {
      const r = await buildExternalPrompt({ projectId, moduleId, moduleKey, inputs });
      if (!r.ok) {
        toast.error(r.error.message ?? "프롬프트를 만들지 못했어요.");
        return;
      }
      await navigator.clipboard.writeText(r.data.prompt);
      toast.success("프롬프트를 복사했어요. ChatGPT·Claude 등에 붙여넣어 사용하세요.");
    } catch {
      toast.error("복사에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setCopying(false);
    }
  }

  // Manual fallback: paste a result produced in an external AI. It persists via
  // submitStructuredResult / submitExternalResult, then drops into the "저장된 결과"
  // list — the same place AI results live — instead of the document-generation panel,
  // which felt out of place for content the user supplied themselves.
  async function submitPaste() {
    if (!pasteText.trim()) {
      toast.error("결과를 붙여넣어 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      let item: SavedArtifact | null = null;

      // 시각화 도구: 붙여넣은 JSON 결과를 추출해 바로 도식으로 저장.
      if (vizDefs.length > 0) {
        const { json, doc } = splitDocAndJson(pasteText);
        if (json) {
          const rs = await submitStructuredResult({
            projectId,
            moduleId,
            content: json,
            contentMd: doc || undefined,
          });
          if (!rs.ok) {
            toast.error(rs.error.message ?? "결과 저장에 실패했어요.");
            return;
          }
          item = {
            id: rs.data.artifactId,
            content: json,
            contentMd: doc || null,
            status: "human_verified",
            founderTake: null,
            createdAt: now,
            pinned: false,
          };
          toast.success(
            doc ? "문서와 도식을 함께 저장했어요." : "붙여넣은 결과를 도식으로 저장했어요.",
          );
        }
        // JSON을 찾지 못하면 아래 일반 텍스트 저장으로 진행합니다.
      }

      if (!item) {
        const r = await submitExternalResult({ projectId, moduleId, inputs, text: pasteText });
        if (!r.ok) {
          toast.error(r.error.message ?? "결과 저장에 실패했어요.");
          return;
        }
        // Don't claim success unless an artifact row actually exists — otherwise the
        // result silently won't appear in KB/문서 조립 ("저장된 도구 결과가 없어요").
        if (!r.data.artifactId) {
          toast.error("결과가 저장되지 않았어요. DB 설정(마이그레이션 0008)을 확인하거나 다시 시도해 주세요.");
          return;
        }
        item = {
          id: r.data.artifactId,
          content: r.data.kind === "structured" ? r.data.content : { markdown: r.data.contentMd },
          contentMd: r.data.kind === "structured" ? null : r.data.contentMd,
          status: r.data.verification,
          founderTake: null,
          createdAt: now,
          pinned: false,
        };
        toast.success("외부 결과를 저장했어요. 아래 ‘저장된 결과’에서 확인·수정할 수 있어요.");
      }

      // Land it at the top of 저장된 결과, expanded, and return to that view.
      const created = item;
      setSavedItems((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setHighlightId(created.id);
      setStatus("idle");
      setShowPaste(false);
      setPasteText("");
    } catch {
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  // Decision Gate: pass / send back / reject, recording the Founder's Take.
  const decide = React.useCallback(
    async (next: VerificationStatus) => {
      if (!artifactId) return;
      const r = await verifyArtifact({ artifactId, status: next, founderTake: take });
      if (r.ok) {
        setVerification(next);
        toast.success(
          next === "human_verified"
            ? "검증 완료"
            : next === "needs_review"
              ? "수정 필요로 표시했습니다"
              : "반려했습니다",
        );
      } else {
        toast.error(r.error.message ?? "실패");
      }
    },
    [artifactId, take],
  );

  const act = React.useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, okMsg: string) => {
      if (!artifactId) return;
      const r = await fn();
      if (r.ok) toast.success(okMsg);
      else toast.error(r.error?.message ?? "실패");
    },
    [artifactId],
  );

  const recheckArtifact = React.useCallback(() => {
    setResolveError(null);
    if (lastRunId) void resolveArtifact(lastRunId);
  }, [lastRunId, resolveArtifact]);

  const openPaste = React.useCallback(() => setShowPaste(true), []);

  const onVizLayout = React.useCallback(
    (templateId: string, layout: PosLayout) => {
      setVizLayouts((s) => ({ ...s, [templateId]: layout }));
      if (!artifactId) return;
      if (vizSaveTimer.current) clearTimeout(vizSaveTimer.current);
      vizSaveTimer.current = setTimeout(() => {
        void saveArtifactViz({ artifactId, templateId, layout });
      }, 600);
    },
    [artifactId],
  );

  // Reset the visualization view when a new result arrives; seed any saved layout.
  React.useEffect(() => {
    const v =
      result && typeof result === "object" && !Array.isArray(result)
        ? (result as Record<string, unknown>).__viz
        : undefined;
    setVizLayouts(v && typeof v === "object" ? (v as Record<string, PosLayout>) : {});
    setVizIdx(0);
    setVizMode(true);
  }, [result]);

  const isMarkdown =
    !!result && typeof result === "object" && "markdown" in (result as object);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{moduleName}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <EditPromptButton projectId={projectId} moduleId={moduleId} className="shrink-0" />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Left: inputs + run / external-AI fallback ── */}
        <div className="space-y-5">
          <div className="space-y-3">
            {contentVars.length > 0 && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                입력 내용
              </p>
            )}
            {contentVars.map((v) => (
              <Field key={v.key} v={v} value={inputs[v.key]} onChange={setVal} />
            ))}
          </div>
          {settingVars.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                출력 설정
              </p>
              {settingVars.map((v) => (
                <Field key={v.key} v={v} value={inputs[v.key]} onChange={setVal} />
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {AI_ENABLED && (
              <Button onClick={run} disabled={status === "running"} className="flex-1">
                {status === "running" ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    생성 중…
                  </>
                ) : (
                  <>
                    <PlayIcon className="size-4" />
                    실행
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant={AI_ENABLED ? "outline" : "default"}
              onClick={copyPrompt}
              disabled={copying}
              className={AI_ENABLED ? undefined : "flex-1"}
              title="이 도구의 프롬프트를 복사해 ChatGPT·Claude 등 외부 AI에서 사용하세요"
            >
              {copying ? <Loader2Icon className="size-4 animate-spin" /> : <CopyIcon className="size-4" />}
              프롬프트 복사
            </Button>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPaste((v) => !v)}
              className="w-full text-muted-foreground"
            >
              <ClipboardPasteIcon className="size-4" />
              외부 AI 결과 붙여넣기
            </Button>
            {showPaste && (
              <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  위 ‘프롬프트 복사’로 ChatGPT·Claude에서 돌린 결과를 그대로 붙여넣으세요.
                  별도 검증 없이 KB·문서에 바로 쓸 수 있어요.
                  {vizDefs.length > 0 &&
                    " 이 도구는 복사된 프롬프트에 JSON 형식이 포함돼, 붙여넣으면 자동으로 도식으로 그려집니다."}
                </p>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="외부 AI가 생성한 결과를 붙여넣기"
                  className="min-h-[160px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitPaste} disabled={submitting}>
                    {submitting ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <CheckIcon className="size-4" />
                    )}
                    결과 저장
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowPaste(false);
                      setPasteText("");
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: status-driven output ── */}
        <div>
          {status === "idle" && (
            <>
              {savedItems.length > 0 && (
                <div className="mb-5">
                  <SavedResults
                    moduleKey={moduleKey}
                    items={savedItems}
                    onChange={setSavedItems}
                    highlightId={highlightId}
                  />
                </div>
              )}
              <GuideCard guide={guide} moduleName={moduleName} />
            </>
          )}
          {status === "running" &&
            outputKind === "structured" &&
            (vizDefs.length > 0 ? <VizSkeleton /> : <RunningSkeleton />)}
          {status === "running" && outputKind !== "structured" && (
            <div className="rounded-xl border border-border bg-card p-5">
              <Markdown>{streamText || "…"}</Markdown>
            </div>
          )}
          {status === "error" && (
            <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-500" />
                AI 실행이 막혔어요
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                사용량 한도(예: 무료 등급 일일 한도)나 일시적인 오류일 수 있어요. 직접 외부 AI에서
                돌려 결과를 가져올 수 있습니다 — ① 프롬프트 복사 → ② ChatGPT·Claude에서 실행 →
                ③ 결과 붙여넣기.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copyPrompt} disabled={copying}>
                  <CopyIcon className="size-4" />
                  프롬프트 복사
                </Button>
                <Button size="sm" onClick={() => setShowPaste(true)}>
                  <ClipboardPasteIcon className="size-4" />
                  결과 붙여넣기
                </Button>
              </div>
            </div>
          )}
          {status === "done" && (
            <div className="space-y-4">
              <ResultView
                result={result}
                isMarkdown={isMarkdown}
                vizDefs={vizDefs}
                vizMode={vizMode}
                onVizModeChange={setVizMode}
                vizIdx={vizIdx}
                onVizIdxChange={setVizIdx}
                docMd={docMd}
                vizLayouts={vizLayouts}
                onVizLayout={onVizLayout}
              />
              {sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">참고한 자료:</span>
                  {sources.map((s, i) => (
                    <Badge key={i} variant="secondary">
                      {s.label}
                    </Badge>
                  ))}
                </div>
              )}
              <DecisionGate
                verification={verification}
                take={take}
                onTakeChange={setTake}
                artifactId={artifactId}
                resolveError={resolveError}
                lastRunId={lastRunId}
                onDecide={decide}
                onRecheck={recheckArtifact}
                onPaste={openPaste}
              />
              <SecondaryActions
                projectId={projectId}
                artifactId={artifactId}
                verification={verification}
                onAct={act}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
