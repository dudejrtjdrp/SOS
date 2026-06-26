"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  PinIcon,
  BookmarkPlusIcon,
  PlayIcon,
  Loader2Icon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  XIcon,
  LightbulbIcon,
  CopyIcon,
  ClipboardPasteIcon,
  CheckIcon,
} from "lucide-react";
import type { Variable } from "@/core/schemas/variables";
import type { VerificationStatus } from "@/types/db";
import { createClient } from "@/lib/supabase/client";
import { pinArtifact, rateArtifact, saveArtifactToKnowledge, saveArtifactViz, verifyArtifact } from "@/server/actions/artifact";
import { buildExternalPrompt, submitExternalResult, submitStructuredResult } from "@/server/actions/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { StructuredResult } from "./structured-result";
import { VizSkeleton } from "./skeletons";
import { Viz, type PosLayout } from "./viz";
import { SavedResults, type SavedArtifact } from "./saved-results";
import { getViz } from "@/core/viz/registry";
import { ModuleIcon } from "./module-icon";
import { EditPromptButton } from "./edit-prompt-button";
import { getGuide, getFieldHelp, SETTING_KEYS } from "@/core/modules/guide";
import { AI_ENABLED } from "@/lib/flags";

type Source = { sourceType: string; sourceId: string; label: string; similarity: number };
type Status = "idle" | "running" | "done" | "error";

/** Pull a JSON object out of a pasted blob (handles ```json fences + prose). */
function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const s = body.indexOf("{");
  const e = body.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    const o = JSON.parse(body.slice(s, e + 1));
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Split a pasted blob into document prose (markdown) and the visualization JSON. */
function splitDocAndJson(text: string): { json: Record<string, unknown> | null; doc: string } {
  const json = extractJson(text);
  let doc = text;
  const fence = text.match(/```(?:json)?\s*[\s\S]*?```/i);
  if (fence) {
    doc = text.replace(fence[0], "").trim();
  } else if (json) {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s !== -1 && e > s) doc = (text.slice(0, s) + text.slice(e + 1)).trim();
  }
  return { json, doc };
}

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
}) {
  const initial = React.useMemo(() => {
    const o: Record<string, unknown> = {};
    for (const v of variables) {
      const fromKB = v.source?.startsWith("kb:") ? kb[v.source.slice(3)] : undefined;
      o[v.key] =
        fromKB ??
        v.default ??
        (v.type === "multiselect" ? [] : v.type === "slider" ? v.min ?? 1 : "");
    }
    return o;
  }, [variables, kb]);

  const [inputs, setInputs] = React.useState<Record<string, unknown>>(initial);
  const [status, setStatus] = React.useState<Status>("idle");
  const [streamText, setStreamText] = React.useState("");
  const [result, setResult] = React.useState<unknown>(null);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [artifactId, setArtifactId] = React.useState<string | null>(null);
  const [verification, setVerification] = React.useState<VerificationStatus>("ai_draft");
  const [take, setTake] = React.useState("");
  const [copying, setCopying] = React.useState(false);
  const [showPaste, setShowPaste] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [savedItems, setSavedItems] = React.useState<SavedArtifact[]>(saved);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const [resolveError, setResolveError] = React.useState<null | "failed" | "timeout">(null);
  const [lastRunId, setLastRunId] = React.useState<string | null>(null);
  const [vizMode, setVizMode] = React.useState(true);
  const [docMd, setDocMd] = React.useState<string | null>(null);
  const [vizIdx, setVizIdx] = React.useState(0);
  const [vizLayouts, setVizLayouts] = React.useState<Record<string, PosLayout>>({});
  const vizSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setVal = (k: string, v: unknown) => setInputs((s) => ({ ...s, [k]: v }));

  const guide = getGuide(moduleKey);
  const settingVars = variables.filter((v) => SETTING_KEYS.includes(v.key));
  const contentVars = variables.filter((v) => !SETTING_KEYS.includes(v.key));
  const vizDefs = React.useMemo(() => getViz(moduleKey), [moduleKey]);

  function field(v: Variable) {
    const isKB = v.source?.startsWith("kb:") ?? false;
    const val = inputs[v.key];
    const empty =
      val == null ||
      (typeof val === "string" && val.trim() === "") ||
      (Array.isArray(val) && val.length === 0);
    const help = v.description ?? getFieldHelp(v.key);
    return (
      <div key={v.key} className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={v.key}>{v.label}</Label>
          {v.required && <span className="text-xs text-[var(--danger)]">*</span>}
          {isKB && (
            <Badge
              variant="secondary"
              className="h-4 rounded px-1.5 text-[10px] font-normal"
            >
              KB 자동
            </Badge>
          )}
        </div>
        <VarInput v={v} value={inputs[v.key]} onChange={(nv) => setVal(v.key, nv)} />
        {isKB && empty ? (
          <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-500">
            Knowledge Base가 비어 있어요 · 직접 입력하거나 KB를 채우세요
          </p>
        ) : help ? (
          <p className="text-[11px] leading-snug text-muted-foreground">{help}</p>
        ) : null}
      </div>
    );
  }

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
      if (outputKind !== "structured") setStreamText(acc);
    }

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

  async function resolveArtifact(runId: string) {
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
      if (runRow?.status === "failed") {
        setResolveError("failed");
        return;
      }
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    setResolveError("timeout");
  }

  async function act(fn: () => Promise<{ ok: boolean; error?: { message: string } }>, okMsg: string) {
    if (!artifactId) return;
    const r = await fn();
    if (r.ok) toast.success(okMsg);
    else toast.error(r.error?.message ?? "실패");
  }

  // Decision Gate: pass / send back / reject, recording the Founder's Take.
  async function decide(next: VerificationStatus) {
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
  }

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

  function onVizLayout(templateId: string, layout: PosLayout) {
    setVizLayouts((s) => ({ ...s, [templateId]: layout }));
    if (!artifactId) return;
    if (vizSaveTimer.current) clearTimeout(vizSaveTimer.current);
    vizSaveTimer.current = setTimeout(() => {
      void saveArtifactViz({ artifactId, templateId, layout });
    }, 600);
  }

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
        <div className="space-y-5">
          <div className="space-y-3">
            {contentVars.length > 0 && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                입력 내용
              </p>
            )}
            {contentVars.map((v) => field(v))}
          </div>
          {settingVars.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                출력 설정
              </p>
              {settingVars.map((v) => field(v))}
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
            <div className="space-y-5 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ModuleIcon name={guide.icon} className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    이 도구는
                  </p>
                  <p className="font-medium">{guide.tagline || moduleName}</p>
                </div>
              </div>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">이럴 때 쓰세요</dt>
                  <dd className="mt-0.5 text-foreground">{guide.whenToUse}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">이런 결과를 얻어요</dt>
                  <dd className="mt-0.5 text-foreground">{guide.youGet}</dd>
                </div>
                {guide.needs.length > 0 && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">필요 입력</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {guide.needs.map((n) => (
                        <Badge key={n} variant="outline">
                          {n}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              {guide.tip && (
                <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <LightbulbIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>{guide.tip}</span>
                </p>
              )}

              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                {AI_ENABLED ? (
                  <>
                    왼쪽 값을 확인하고 <span className="font-medium text-foreground">실행</span>을 누르세요.
                    Knowledge Base 값은 자동으로 채워집니다.
                  </>
                ) : (
                  <>
                    왼쪽 값을 확인하고 <span className="font-medium text-foreground">프롬프트 복사</span>로
                    ChatGPT·Claude에서 실행한 뒤, 결과를 <span className="font-medium text-foreground">붙여넣기</span>하세요.
                    Knowledge Base 값은 자동으로 채워집니다.
                  </>
                )}
              </p>
            </div>
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
              <div className="rounded-xl border border-border bg-card p-5">
                {isMarkdown ? (
                  <Markdown>{String((result as Record<string, unknown>).markdown ?? "")}</Markdown>
                ) : vizDefs.length > 0 ? (
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
                        model={vizDefs[vizIdx]?.build(result as Record<string, unknown>) ?? null}
                        layout={vizDefs[vizIdx] ? vizLayouts[vizDefs[vizIdx].id] : undefined}
                        onChange={(l) => {
                          const def = vizDefs[vizIdx];
                          if (def) onVizLayout(def.id, l);
                        }}
                      />
                    ) : docMd ? (
                      <Markdown>{docMd}</Markdown>
                    ) : (
                      <StructuredResult content={result} />
                    )}
                  </div>
                ) : (
                  <StructuredResult content={result} />
                )}
              </div>
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
              {/* Decision Gate: a human verifies the AI draft before it feeds KB / 문서. */}
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <VerificationChip status={verification} />
                  <span className="text-sm font-medium">
                    {verification === "human_verified"
                      ? "검증을 완료했어요"
                      : "이 결과를 어떻게 할까요?"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {verification === "human_verified"
                    ? "이제 아래 ‘KB에 저장’으로 지식 베이스에 넣거나, ‘문서 생성’으로 다음 단계로 넘어갈 수 있어요."
                    : "AI가 만든 초안이에요. 내용을 살펴본 뒤 — 맞으면 ‘검증 완료’(→ KB 저장·문서 생성이 열려요), 더 다듬을 거면 ‘수정 필요’, 쓰지 않을 거면 ‘반려’를 누르세요."}
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="founder-take">
                    내 판단 <span className="font-normal text-muted-foreground">· 선택</span>
                  </Label>
                  <Textarea
                    id="founder-take"
                    value={take}
                    onChange={(e) => setTake(e.target.value)}
                    placeholder="이 결과를 어떻게 보는지 한 줄 남기면 KB에 함께 저장돼요. 비워도 됩니다."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide("human_verified")} disabled={!artifactId}>
                    <ShieldCheckIcon className="size-4" />
                    검증 완료 · 다음 단계 열기
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide("needs_review")} disabled={!artifactId}>
                    <TriangleAlertIcon className="size-4" />
                    수정 필요
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide("rejected")} disabled={!artifactId}>
                    <XIcon className="size-4" />
                    반려
                  </Button>
                </div>
                {!artifactId &&
                  (resolveError ? (
                    <div className="space-y-2">
                      <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-500">
                        {resolveError === "failed"
                          ? "AI 실행이 도중에 막혔어요(사용량 한도·오류). 결과가 저장되지 않았어요 — 왼쪽에서 다시 실행하거나, 외부 AI 결과를 붙여넣으세요."
                          : "결과 저장을 아직 확인하지 못했어요. ‘다시 확인’을 누르거나 페이지를 새로고침해 주세요."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {resolveError === "timeout" && lastRunId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResolveError(null);
                              void resolveArtifact(lastRunId);
                            }}
                          >
                            다시 확인
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setShowPaste(true)}>
                          <ClipboardPasteIcon className="size-4" />
                          결과 붙여넣기
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      결과를 저장하는 중… 잠시 후 버튼이 활성화돼요.
                    </p>
                  ))}
              </div>

              {/* Secondary actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => act(() => rateArtifact({ artifactId: artifactId!, feedback: 1 }), "피드백 감사합니다")} disabled={!artifactId}>
                  <ThumbsUpIcon className="size-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => act(() => rateArtifact({ artifactId: artifactId!, feedback: -1 }), "피드백 감사합니다")} disabled={!artifactId}>
                  <ThumbsDownIcon className="size-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => act(() => pinArtifact({ artifactId: artifactId!, pinned: true }), "고정했습니다")} disabled={!artifactId}>
                  <PinIcon className="size-4" />
                  고정
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act(() => saveArtifactToKnowledge({ artifactId: artifactId! }), "Knowledge Base에 저장했습니다")}
                  disabled={!artifactId || verification !== "human_verified"}
                  title={verification !== "human_verified" ? "먼저 검증을 완료하세요" : undefined}
                >
                  <BookmarkPlusIcon className="size-4" />
                  KB에 저장
                </Button>
                {verification === "human_verified" ? (
                  <Link href={`/p/${projectId}/documents`} className="ml-auto text-sm text-primary hover:underline">
                    다음 단계: 문서 생성 →
                  </Link>
                ) : (
                  <span className="ml-auto text-sm text-muted-foreground" title="먼저 검증을 완료하세요">
                    다음 단계: 문서 생성 →
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VarInput({
  v,
  value,
  onChange,
}: {
  v: Variable;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (v.type === "textarea")
    return (
      <Textarea
        id={v.key}
        value={String(value ?? "")}
        placeholder={v.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  if (v.type === "select" || v.type === "language") {
    const opts = v.type === "language" ? ["ko", "en", "ja"] : v.options ?? [];
    return (
      <Select id={v.key} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }

  if (v.type === "multiselect") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    if (v.options && v.options.length) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {v.options.map((o) => {
            const on = arr.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <Input
        id={v.key}
        value={arr.join(", ")}
        placeholder="쉼표로 구분"
        onChange={(e) =>
          onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
        }
      />
    );
  }

  if (v.type === "slider") {
    const n = typeof value === "number" ? value : v.min ?? 1;
    return (
      <div className="flex items-center gap-2">
        <Slider
          id={v.key}
          min={v.min ?? 1}
          max={v.max ?? 5}
          value={n}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-6 text-center text-xs text-muted-foreground">{n}</span>
      </div>
    );
  }

  return (
    <Input
      id={v.key}
      value={String(value ?? "")}
      placeholder={v.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function RunningSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
    </div>
  );
}

const VERIFICATION_CHIP: Record<VerificationStatus, { label: string; cls: string }> = {
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

function VerificationChip({
  status,
  manual,
}: {
  status: VerificationStatus;
  manual?: boolean;
}) {
  // External (pasted) results aren't this app's AI draft — show provenance until
  // the human confirms or rejects them.
  if (manual && (status === "ai_draft" || status === "needs_review")) {
    return (
      <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400">
        외부 결과
      </Badge>
    );
  }
  const s = VERIFICATION_CHIP[status];
  return <Badge className={s.cls}>{s.label}</Badge>;
}
