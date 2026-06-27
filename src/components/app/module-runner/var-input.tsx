"use client";

import * as React from "react";
import type { Variable } from "@/core/schemas/variables";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

/** Renders the right input control for a single variable. Memoized so a keystroke
 *  in one field doesn't re-render every other field. */
export const VarInput = React.memo(function VarInput({
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
});
