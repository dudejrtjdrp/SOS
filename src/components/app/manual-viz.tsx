"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon, XIcon, SaveIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getViz } from "@/core/viz/registry";
import {
  getVizInput,
  type VizField,
  type VizSubField,
  type VizInputSchema,
} from "@/core/viz/input-schema";
import { submitStructuredResult } from "@/server/actions/module";
import { Viz } from "./viz";

/**
 * AI-free visualization. Renders the tool's structured input fields, builds the
 * content object live, and feeds it straight into the existing <Viz> template:
 * data → UI template → render. "결과로 저장" persists it as a real artifact.
 */
export function ManualViz({
  projectId,
  moduleId,
  moduleKey,
}: {
  projectId: string;
  moduleId: string;
  moduleKey: string | null;
}) {
  const schema = React.useMemo(() => getVizInput(moduleKey), [moduleKey]);
  const vizDefs = React.useMemo(() => getViz(moduleKey), [moduleKey]);
  const [data, setData] = React.useState<Record<string, unknown>>(() => initialData(schema));
  const [vizIdx, setVizIdx] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  if (!schema || vizDefs.length === 0) return null;

  const def = vizDefs[Math.min(vizIdx, vizDefs.length - 1)];
  const model = def ? def.build(data) : null;
  const hasAny = hasContent(data);

  async function save() {
    const content = cleanContent(data);
    if (!hasContent(content)) {
      toast.error("먼저 데이터를 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const r = await submitStructuredResult({ projectId, moduleId, content });
      if (!r.ok) {
        toast.error(r.error.message ?? "저장에 실패했어요.");
        return;
      }
      toast.success("시각화를 결과로 저장했어요. 아래 ‘저장된 결과’와 KB·문서에서 바로 쓸 수 있어요.");
      router.refresh();
    } catch {
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SparklesIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            직접 입력 → 시각화
          </p>
          <p className="text-sm text-muted-foreground">
            AI 없이, 입력한 데이터를 그대로 도식으로 그립니다. 오른쪽에서 실시간 미리보기를 확인하세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          {schema.hint && (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              {schema.hint}
            </p>
          )}
          {schema.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={data[f.key]}
              onChange={(v) => setData((s) => ({ ...s, [f.key]: v }))}
            />
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              미리보기
            </span>
            {vizDefs.length > 1 && (
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
          <div className="rounded-lg border border-border bg-background p-3">
            {hasAny ? (
              <Viz model={model} />
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                왼쪽에 데이터를 입력하면 여기에 도식이 그려져요.
              </p>
            )}
          </div>
          <Button size="sm" onClick={save} disabled={saving || !hasAny}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            결과로 저장
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── field inputs ──────────────────────────────────────────────────

function ListInput({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  return (
    <Textarea
      value={arr.join("\n")}
      placeholder={placeholder ? `${placeholder} (한 줄에 하나)` : "한 줄에 하나씩"}
      onChange={(e) => onChange(e.target.value.split("\n"))}
      className="min-h-[84px]"
    />
  );
}

function SubInput({
  field,
  value,
  onChange,
}: {
  field: VizSubField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.kind === "list") {
    return <ListInput value={value} onChange={onChange} placeholder={field.placeholder} />;
  }
  if (field.kind === "select") {
    const v = typeof value === "string" && value ? value : field.options[0];
    return (
      <Select value={v} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      value={String(value ?? "")}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: VizField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.kind === "list") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <ListInput value={value} onChange={onChange} placeholder={field.placeholder} />
      </div>
    );
  }

  if (field.kind === "text") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        {field.multiline ? (
          <Textarea
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <Input
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    );
  }

  if (field.kind === "group") {
    const obj =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <Label className="text-xs font-medium">{field.label}</Label>
        {field.fields.map((sf) => (
          <div key={sf.key} className="space-y-1">
            <span className="text-[11px] text-muted-foreground">{sf.label}</span>
            <SubInput
              field={sf}
              value={obj[sf.key]}
              onChange={(v) => onChange({ ...obj, [sf.key]: v })}
            />
          </div>
        ))}
      </div>
    );
  }

  // objectList
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{field.label}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, emptyItem(field.fields)])}
        >
          <PlusIcon className="size-3.5" />
          {field.itemLabel} 추가
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          ‘{field.itemLabel} 추가’로 항목을 넣으세요.
        </p>
      )}
      {items.map((it, idx) => (
        <div key={idx} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {field.itemLabel} {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="text-muted-foreground hover:text-foreground"
              aria-label="삭제"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          {field.fields.map((sf) => (
            <div key={sf.key} className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{sf.label}</span>
              <SubInput
                field={sf}
                value={it[sf.key]}
                onChange={(v) => {
                  const next = items.slice();
                  next[idx] = { ...it, [sf.key]: v };
                  onChange(next);
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── state helpers ─────────────────────────────────────────────────

function initialData(schema: VizInputSchema | null): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (!schema) return o;
  for (const f of schema.fields) {
    if (f.kind === "list") o[f.key] = [];
    else if (f.kind === "text") o[f.key] = "";
    else if (f.kind === "group") o[f.key] = emptyItem(f.fields);
    else o[f.key] = [];
  }
  return o;
}

function emptyItem(fields: VizSubField[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const sf of fields) {
    o[sf.key] = sf.kind === "list" ? [] : sf.kind === "select" ? sf.options[0] ?? "" : "";
  }
  return o;
}

function cleanList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

/** Trim/drop empties so saved content is clean (build() also tolerates blanks). */
function cleanContent(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      if (v.every((x) => typeof x === "string")) {
        out[k] = cleanList(v);
      } else {
        out[k] = (v as Record<string, unknown>[])
          .map(cleanObj)
          .filter((o) => Object.values(o).some((x) => (Array.isArray(x) ? x.length : x)));
      }
    } else if (v && typeof v === "object") {
      out[k] = cleanObj(v as Record<string, unknown>);
    } else {
      out[k] = String(v ?? "").trim();
    }
  }
  return out;
}

function cleanObj(obj: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    o[k] = Array.isArray(v) ? cleanList(v) : String(v ?? "").trim();
  }
  return o;
}

/** True if the user has entered anything renderable. */
function hasContent(data: Record<string, unknown>): boolean {
  return Object.values(data).some((v) => {
    if (Array.isArray(v)) {
      return v.some((x) =>
        typeof x === "string"
          ? x.trim()
          : x && typeof x === "object"
            ? hasContent(x as Record<string, unknown>)
            : false,
      );
    }
    if (v && typeof v === "object") return hasContent(v as Record<string, unknown>);
    return typeof v === "string" ? v.trim() : !!v;
  });
}
