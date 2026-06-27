"use client";

import * as React from "react";
import { Markdown } from "@/components/ui/markdown";
import type { VizDef } from "@/core/viz/registry";
import { StructuredResult } from "../structured-result";
import { Viz, type PosLayout } from "../viz";

/** Renders a finished result: markdown, or a visualization with a 시각화/원본(문서)
 *  toggle and per-template tabs. Memoized so editing the input form (which lives in
 *  the parent) never re-renders the — potentially heavy — viz subtree. */
export const ResultView = React.memo(function ResultView({
  result,
  isMarkdown,
  vizDefs,
  vizMode,
  onVizModeChange,
  vizIdx,
  onVizIdxChange,
  docMd,
  vizLayouts,
  onVizLayout,
}: {
  result: unknown;
  isMarkdown: boolean;
  vizDefs: VizDef[];
  vizMode: boolean;
  onVizModeChange: (mode: boolean) => void;
  vizIdx: number;
  onVizIdxChange: (idx: number) => void;
  docMd: string | null;
  vizLayouts: Record<string, PosLayout>;
  onVizLayout: (templateId: string, layout: PosLayout) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {isMarkdown ? (
        <Markdown>{String((result as Record<string, unknown>).markdown ?? "")}</Markdown>
      ) : vizDefs.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onVizModeChange(true)}
                className={`rounded px-2 py-1 ${vizMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                시각화
              </button>
              <button
                type="button"
                onClick={() => onVizModeChange(false)}
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
                    onClick={() => onVizIdxChange(idx)}
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
  );
});

/** Streaming placeholder shown while a structured (non-viz) run is in flight. */
export function RunningSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
    </div>
  );
}
