"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, SaveIcon, Share2Icon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { savePromptVersion, setCurrentPromptVersion, publishModuleToWorkspace } from "@/server/actions/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type VarRow = { key: string; label: string; type: string; source: string; optionsText: string };
const VAR_TYPES = ["text", "textarea", "select", "multiselect", "slider", "language"];

export function PromptBuilder({
  projectId,
  moduleId,
  templateId,
  workspaceId,
  moduleName,
  visibility,
  outputKind: initialKind,
  current,
  versions,
}: {
  projectId: string;
  moduleId: string;
  templateId: string;
  workspaceId: string;
  moduleName: string;
  visibility: string;
  outputKind: string;
  current: {
    system_prompt?: string;
    instructions?: string;
    variables?: unknown;
    output_format?: unknown;
  } | null;
  versions: { id: string; version: number; changelog: string | null; created_at: string }[];
}) {
  const router = useRouter();
  const [systemPrompt, setSystemPrompt] = React.useState(current?.system_prompt ?? "");
  const [instructions, setInstructions] = React.useState(current?.instructions ?? "");
  const [outputKind, setOutputKind] = React.useState(initialKind);
  const [vars, setVars] = React.useState<VarRow[]>(() =>
    Array.isArray(current?.variables)
      ? (current!.variables as Record<string, unknown>[]).map((v) => ({
          key: String(v.key ?? ""),
          label: String(v.label ?? ""),
          type: String(v.type ?? "text"),
          source: String(v.source ?? ""),
          optionsText: Array.isArray(v.options) ? (v.options as string[]).join(", ") : "",
        }))
      : [],
  );
  const [outputFormatText, setOutputFormatText] = React.useState(
    current?.output_format ? JSON.stringify(current.output_format, null, 2) : '{\n  "kind": "object",\n  "fields": {}\n}',
  );
  const [saving, setSaving] = React.useState(false);

  function addVar() {
    setVars((vs) => [...vs, { key: "", label: "", type: "text", source: "", optionsText: "" }]);
  }
  function setVar(i: number, patch: Partial<VarRow>) {
    setVars((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }
  function removeVar(i: number) {
    setVars((vs) => vs.filter((_, j) => j !== i));
  }

  async function save() {
    let outputFormat: Record<string, unknown> = {};
    if (outputKind === "structured") {
      try {
        outputFormat = JSON.parse(outputFormatText);
      } catch {
        toast.error("output_format JSON 형식이 올바르지 않습니다.");
        return;
      }
    }
    const variables = vars
      .filter((v) => v.key.trim())
      .map((v) => ({
        key: v.key.trim(),
        label: v.label || v.key,
        type: v.type,
        ...(v.source ? { source: v.source } : {}),
        ...(v.optionsText
          ? { options: v.optionsText.split(",").map((s) => s.trim()).filter(Boolean) }
          : {}),
      }));

    setSaving(true);
    const r = await savePromptVersion({
      promptTemplateId: templateId,
      workspaceId,
      outputKind: outputKind as "structured" | "markdown" | "document",
      systemPrompt,
      instructions,
      variables,
      outputFormat,
      examples: [],
    });
    setSaving(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success(`버전 ${r.data.version} 저장됨`);
    router.refresh();
  }

  async function restore(versionId: string) {
    const r = await setCurrentPromptVersion({ promptTemplateId: templateId, versionId });
    if (!r.ok) return toast.error(r.error.message);
    toast.success("이전 버전으로 복원했습니다.");
    router.refresh();
  }

  async function publish() {
    const r = await publishModuleToWorkspace({ moduleId });
    if (!r.ok) return toast.error(r.error.message);
    toast.success("팀에 공유했습니다.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{moduleName}</h1>
        {visibility === "workspace" ? <Badge>팀 공유됨</Badge> : <Badge variant="secondary">내 모듈</Badge>}
        <div className="ml-auto flex gap-2">
          <Link
            href={`/p/${projectId}/run/${moduleId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <PlayIcon className="size-4" /> 테스트 실행
          </Link>
          {visibility !== "workspace" && (
            <Button size="sm" variant="outline" onClick={publish}>
              <Share2Icon className="size-4" /> 팀 공유
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            <SaveIcon className="size-4" /> {saving ? "저장 중…" : "버전 저장"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <Field label="System Prompt">
            <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="min-h-[100px]" />
          </Field>
          <Field label="Instructions">
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-[100px]" />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Variables</Label>
              <Button size="sm" variant="ghost" onClick={addVar}>
                <PlusIcon className="size-4" /> 변수
              </Button>
            </div>
            <div className="space-y-2">
              {vars.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2">
                  <Input placeholder="key" value={v.key} onChange={(e) => setVar(i, { key: e.target.value })} />
                  <Input placeholder="라벨" value={v.label} onChange={(e) => setVar(i, { label: e.target.value })} />
                  <Select value={v.type} onChange={(e) => setVar(i, { type: e.target.value })} className="w-32">
                    {VAR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => removeVar(i)} aria-label="삭제">
                    <Trash2Icon className="size-4" />
                  </Button>
                  <Input
                    placeholder="source (예: kb:market)"
                    value={v.source}
                    onChange={(e) => setVar(i, { source: e.target.value })}
                    className="col-span-2"
                  />
                  <Input
                    placeholder="options (쉼표)"
                    value={v.optionsText}
                    onChange={(e) => setVar(i, { optionsText: e.target.value })}
                    className="col-span-2"
                  />
                </div>
              ))}
              {vars.length === 0 && (
                <p className="text-xs text-muted-foreground">변수를 추가하면 입력 폼이 자동 생성됩니다.</p>
              )}
            </div>
          </div>

          <Field label="Output">
            <Select value={outputKind} onChange={(e) => setOutputKind(e.target.value)} className="w-48">
              <option value="markdown">markdown (자유 서술)</option>
              <option value="structured">structured (스키마 강제)</option>
            </Select>
          </Field>
          {outputKind === "structured" && (
            <Field label="Output Format (JSON)">
              <Textarea
                value={outputFormatText}
                onChange={(e) => setOutputFormatText(e.target.value)}
                className="min-h-[160px] font-mono text-xs"
              />
            </Field>
          )}
        </div>

        <aside>
          <h2 className="mb-2 text-sm font-medium">버전 기록</h2>
          <div className="space-y-1.5">
            {versions.map((ver) => (
              <div key={ver.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                <span className="font-medium">v{ver.version}</span>
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {new Date(ver.created_at).toLocaleDateString("ko-KR")}
                </span>
                <Button size="icon" variant="ghost" onClick={() => restore(ver.id)} aria-label="복원">
                  <RotateCcwIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
