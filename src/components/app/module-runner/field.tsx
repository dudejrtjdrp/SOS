"use client";

import * as React from "react";
import type { Variable } from "@/core/schemas/variables";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getFieldHelp } from "@/core/modules/guide";
import { VarInput } from "./var-input";

/** A labelled field: title row (label / required / KB badge), the input, and a
 *  hint line. Memoized; `onChange` is keyed by `v.key` so the parent can pass a
 *  single stable handler for all fields. */
export const Field = React.memo(function Field({
  v,
  value,
  onChange,
}: {
  v: Variable;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  const isKB = v.source?.startsWith("kb:") ?? false;
  const empty =
    value == null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
  const help = v.description ?? getFieldHelp(v.key);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={v.key}>{v.label}</Label>
        {v.required && <span className="text-xs text-[var(--danger)]">*</span>}
        {isKB && (
          <Badge variant="secondary" className="h-4 rounded px-1.5 text-[10px] font-normal">
            KB 자동
          </Badge>
        )}
      </div>
      <VarInput v={v} value={value} onChange={(nv) => onChange(v.key, nv)} />
      {isKB && empty ? (
        <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-500">
          Knowledge Base가 비어 있어요 · 직접 입력하거나 KB를 채우세요
        </p>
      ) : help ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
});
