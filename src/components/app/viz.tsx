"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { VizModel, PosAxes, PosItem } from "@/core/viz/registry";

export interface PosLayout {
  positions: Record<string, { x: number; y: number }>;
  axes: PosAxes;
}

const TONE: Record<string, string> = {
  pos: "border-emerald-500/40 bg-emerald-500/5",
  neg: "border-[var(--danger)]/40 bg-[var(--danger)]/5",
  neutral: "border-border bg-muted/30",
};

/** Dispatch a VizModel to its renderer. Positioning is interactive + persisted. */
export function Viz({
  model,
  layout,
  onChange,
}: {
  model: VizModel | null;
  layout?: PosLayout;
  onChange?: (l: PosLayout) => void;
}) {
  if (!model) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        이 결과로는 시각화를 만들 수 없어요. ‘원본’ 보기로 확인하세요.
      </p>
    );
  }
  switch (model.type) {
    case "matrix2x2":
      return <Matrix2x2 m={model} />;
    case "columns":
      return <Columns m={model} />;
    case "positioning":
      return <PositioningMap m={model} layout={layout} onChange={onChange} />;
    case "forces":
      return <Forces m={model} />;
    case "canvas":
      return <Canvas m={model} />;
    case "funnel":
      return <Funnel m={model} />;
    case "hub":
      return <Hub m={model} />;
  }
}

function Items({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
  return (
    <ul className="space-y-1 text-xs leading-snug">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="select-none text-muted-foreground">·</span>
          <span className="whitespace-pre-wrap">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Matrix2x2({ m }: { m: Extract<VizModel, { type: "matrix2x2" }> }) {
  return (
    <div>
      {m.yLabel && (
        <div className="mb-1 text-center text-[11px] text-muted-foreground">{m.yLabel}</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {m.quadrants.map((q) => (
          <div key={q.key} className={`rounded-lg border p-3 ${TONE[q.tone]}`}>
            <div className="mb-1.5 text-sm font-medium">{q.title}</div>
            <Items items={q.items} />
          </div>
        ))}
      </div>
      {m.xLabel && (
        <div className="mt-1 text-center text-[11px] text-muted-foreground">{m.xLabel}</div>
      )}
    </div>
  );
}

function Columns({ m }: { m: Extract<VizModel, { type: "columns" }> }) {
  return (
    <div className="space-y-3">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, m.columns.length)}, minmax(0, 1fr))` }}
      >
        {m.columns.map((col) => (
          <div key={col.key} className={`rounded-lg border p-3 ${TONE[col.tone ?? "neutral"]}`}>
            <div className="mb-1.5 text-sm font-medium">{col.title}</div>
            <Items items={col.items} />
          </div>
        ))}
      </div>
      {m.note && m.note.text && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-medium text-primary">{m.note.title}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{m.note.text}</p>
        </div>
      )}
    </div>
  );
}

function levelTone(level: string): string {
  if (/높|high/i.test(level)) return "border-[var(--danger)]/50 bg-[var(--danger)]/5";
  if (/낮|low/i.test(level)) return "border-emerald-500/50 bg-emerald-500/5";
  if (level) return "border-amber-500/50 bg-amber-500/5";
  return "border-border bg-muted/30";
}

function ForceCard({
  n,
  center,
}: {
  n: { title: string; level: string; rationale: string };
  center?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${levelTone(n.level)} ${center ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{n.title}</span>
        {n.level && (
          <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
            {n.level}
          </Badge>
        )}
      </div>
      {n.rationale && (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{n.rationale}</p>
      )}
    </div>
  );
}

function Forces({ m }: { m: Extract<VizModel, { type: "forces" }> }) {
  const [top, left, right, bottom] = m.around;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 items-stretch gap-2">
        <div />
        {top ? <ForceCard n={top} /> : <div />}
        <div />
        {left ? <ForceCard n={left} /> : <div />}
        <ForceCard n={m.center} center />
        {right ? <ForceCard n={right} /> : <div />}
        <div />
        {bottom ? <ForceCard n={bottom} /> : <div />}
        <div />
      </div>
      {m.summary && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="text-xs font-medium text-primary">산업 매력도 — </span>
          {m.summary}
        </div>
      )}
    </div>
  );
}

function Canvas({ m }: { m: Extract<VizModel, { type: "canvas" }> }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[720px] gap-2"
        style={{ gridTemplateColumns: `repeat(${m.cols}, minmax(0, 1fr))`, gridAutoRows: "minmax(72px, auto)" }}
      >
        {m.blocks.map((b) => (
          <div
            key={b.key}
            className="rounded-lg border border-border bg-card p-2.5"
            style={{
              gridColumn: `${b.col} / span ${b.colSpan ?? 1}`,
              gridRow: `${b.row} / span ${b.rowSpan ?? 1}`,
            }}
          >
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">{b.title}</div>
            <ul className="space-y-0.5 text-xs leading-snug">
              {b.items.length ? (
                b.items.map((it, i) => <li key={i}>· {it}</li>)
              ) : (
                <li className="text-muted-foreground">—</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Funnel({ m }: { m: Extract<VizModel, { type: "funnel" }> }) {
  return (
    <div className="space-y-2">
      {m.stages.map((s, i) => {
        const width = 100 - i * (50 / Math.max(1, m.stages.length));
        return (
          <div key={s.key} className="flex justify-center">
            <div
              className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-center"
              style={{ width: `${width}%`, minWidth: 200 }}
            >
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <span>
                  {i + 1}. {s.title}
                </span>
                {s.metric && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {s.metric}
                  </Badge>
                )}
              </div>
              {s.items.length > 0 && (
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {s.items.join(" · ")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Hub({ m }: { m: Extract<VizModel, { type: "hub" }> }) {
  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-sm rounded-lg border border-primary/40 bg-primary/5 p-3 text-center">
        <div className="text-sm font-medium text-primary">{m.center.title}</div>
        {m.center.text && (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{m.center.text}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {m.around.map((n) => (
          <div
            key={n.key}
            className={`rounded-lg border p-3 ${
              n.group === "hard" ? "border-border bg-muted/30" : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{n.title}</span>
              <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                {n.group === "hard" ? "Hard" : "Soft"}
              </Badge>
            </div>
            {n.text && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{n.text}</p>}
          </div>
        ))}
      </div>
      {m.note && m.note.text && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-medium text-primary">{m.note.title}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{m.note.text}</p>
        </div>
      )}
    </div>
  );
}

// ── Positioning map — drag dots on two axes; positions + axis labels persist ──

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function defaultPositions(items: PosItem[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const others = items.filter((i) => !i.emphasis);
  items.filter((i) => i.emphasis).forEach((i) => (out[i.id] = { x: 0.5, y: 0.5 }));
  const n = Math.max(1, others.length);
  others.forEach((it, idx) => {
    const a = (idx / n) * 2 * Math.PI - Math.PI / 2;
    out[it.id] = { x: clamp01(0.5 + 0.34 * Math.cos(a)), y: clamp01(0.5 + 0.34 * Math.sin(a)) };
  });
  return out;
}

function PositioningMap({
  m,
  layout,
  onChange,
}: {
  m: Extract<VizModel, { type: "positioning" }>;
  layout?: PosLayout;
  onChange?: (l: PosLayout) => void;
}) {
  const [positions, setPositions] = React.useState<Record<string, { x: number; y: number }>>(
    () => ({ ...defaultPositions(m.items), ...(layout?.positions ?? {}) }),
  );
  const [axes, setAxes] = React.useState<PosAxes>(() => layout?.axes ?? m.axes);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const dragId = React.useRef<string | null>(null);
  const axesRef = React.useRef(axes);
  React.useEffect(() => {
    axesRef.current = axes;
  }, [axes]);

  function pointFromEvent(e: React.PointerEvent) {
    const box = boxRef.current;
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  }

  function setAxis(key: keyof PosAxes, value: string) {
    setAxes((a) => {
      const next = { ...a, [key]: value };
      onChange?.({ positions, axes: next });
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <div className="text-center text-[11px] font-medium text-muted-foreground">
        <input
          value={axes.yTop}
          onChange={(e) => setAxis("yTop", e.target.value)}
          className="w-40 border-b border-transparent bg-transparent text-center hover:border-border focus:border-primary focus:outline-none"
          aria-label="위쪽 축 라벨"
        />
      </div>
      <div className="flex items-stretch gap-2">
        <div className="flex items-center">
          <input
            value={axes.yBottom}
            onChange={(e) => setAxis("yBottom", e.target.value)}
            className="w-24 -rotate-90 whitespace-nowrap border-b border-transparent bg-transparent text-center text-[11px] text-muted-foreground hover:border-border focus:border-primary focus:outline-none"
            aria-label="아래쪽 축 라벨"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            ref={boxRef}
            className="relative h-[420px] w-full touch-none overflow-hidden rounded-xl border border-border bg-muted/20"
          >
            {/* crosshair */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-border" />
            {/* dots */}
            {m.items.map((it) => {
              const p = positions[it.id] ?? { x: 0.5, y: 0.5 };
              return (
                <button
                  key={it.id}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dragId.current = it.id;
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (dragId.current !== it.id) return;
                    const pt = pointFromEvent(e);
                    if (pt) setPositions((s) => ({ ...s, [it.id]: pt }));
                  }}
                  onPointerUp={(e) => {
                    if (dragId.current !== it.id) return;
                    dragId.current = null;
                    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                    setPositions((s) => {
                      onChange?.({ positions: s, axes: axesRef.current });
                      return s;
                    });
                  }}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center gap-1 active:cursor-grabbing"
                >
                  <span
                    className={`size-3 rounded-full border-2 border-background shadow ${
                      it.emphasis ? "bg-primary ring-2 ring-primary/30" : "bg-foreground/70"
                    }`}
                  />
                  <span
                    className={`whitespace-nowrap rounded px-1 text-[11px] ${
                      it.emphasis ? "bg-primary/10 font-medium text-primary" : "bg-background/80 text-foreground"
                    }`}
                  >
                    {it.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <input
              value={axes.xLeft}
              onChange={(e) => setAxis("xLeft", e.target.value)}
              className="w-28 border-b border-transparent bg-transparent hover:border-border focus:border-primary focus:outline-none"
              aria-label="왼쪽 축 라벨"
            />
            <input
              value={axes.xRight}
              onChange={(e) => setAxis("xRight", e.target.value)}
              className="w-28 border-b border-transparent bg-transparent text-right hover:border-border focus:border-primary focus:outline-none"
              aria-label="오른쪽 축 라벨"
            />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        점을 드래그해 배치하고, 축 라벨을 눌러 수정하세요. 배치는 자동 저장됩니다.
      </p>
    </div>
  );
}
