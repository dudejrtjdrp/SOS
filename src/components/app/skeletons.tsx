import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading-state kit. One source of truth for every "잠시 기다려요" surface so
 * route `loading.tsx` files and in-component waits stay visually consistent.
 *
 * - `Spinner` / `LoadingScreen` — indeterminate waits (auth, short fetches).
 * - `*Skeleton` — layout-shaped placeholders that mirror the real page so there
 *   is no layout shift when the data arrives.
 *
 * Pure presentational markup (no hooks) → safe in both server `loading.tsx`
 * files and client components.
 */

/** Inline spinner — matches the app's existing Loader2 + animate-spin convention. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2Icon className={cn("size-4 animate-spin", className)} />;
}

/** Centered indeterminate "로딩창" for short, shapeless waits. */
export function LoadingScreen({
  label = "불러오는 중…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground",
        className,
      )}
    >
      <Spinner className="size-6 text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Full-viewport version for the app shell / first paint. */
export function AppLoading() {
  return <LoadingScreen className="min-h-screen" label="SOS 불러오는 중…" />;
}

// ── shared building blocks ──────────────────────────────────────────────────

function PageWrap({
  width = "max-w-4xl",
  children,
}: {
  width?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("mx-auto px-6 py-8", width)}>{children}</div>;
}

function HeaderSkeleton({ sub = true }: { sub?: boolean }) {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-7 w-48" />
      {sub && <Skeleton className="h-4 w-80 max-w-full" />}
    </div>
  );
}

/** A bordered card placeholder with stacked text lines. */
function CardSkeleton({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <Skeleton className="h-4 w-2/5" />
      <div className="mt-2 space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-3/5" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

/** Plain list-row placeholders (documents, recent results, …). */
function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <Skeleton className="size-4 shrink-0 rounded" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── page-shaped skeletons ───────────────────────────────────────────────────

/** Home — workspace sections with project-card grids. */
export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center gap-2 border-b border-border px-6">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-4 w-12" />
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {Array.from({ length: 2 }).map((_, s) => (
          <section key={s} className="mb-10">
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} className="h-[88px]" />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

/** Project overview — KB/result stat cards + next-step card + recent list. */
export function OverviewSkeleton() {
  return (
    <PageWrap>
      <HeaderSkeleton />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CardSkeleton className="h-28" lines={1} />
        <CardSkeleton className="h-28" lines={1} />
      </div>
      <CardSkeleton className="mb-6 h-32" lines={2} />
      <Skeleton className="mb-3 h-4 w-24" />
      <RowsSkeleton rows={3} />
    </PageWrap>
  );
}

/** Knowledge Base — field editor column + RAG entries aside. */
export function KnowledgeSkeleton() {
  return (
    <PageWrap>
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          ))}
        </div>
        <aside>
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </aside>
      </div>
    </PageWrap>
  );
}

/** A grid of module cards (Library / category pages). */
function ModuleGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Library — header with create button + categorized module grids. */
export function LibrarySkeleton() {
  return (
    <PageWrap>
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      {Array.from({ length: 2 }).map((_, s) => (
        <section key={s} className="mb-7">
          <Skeleton className="mb-2 h-4 w-20" />
          <ModuleGridSkeleton cards={4} />
        </section>
      ))}
    </PageWrap>
  );
}

/** Category (Idea/Research/Validation/Analysis) — header + module grid. */
export function CategorySkeleton() {
  return (
    <PageWrap>
      <HeaderSkeleton />
      <ModuleGridSkeleton cards={6} />
    </PageWrap>
  );
}

/** Documents — KB readiness card, generate grid, assemble box, document list. */
export function DocumentsSkeleton() {
  return (
    <PageWrap>
      <HeaderSkeleton />
      <Skeleton className="mb-6 h-20 w-full rounded-xl" />
      <Skeleton className="mb-3 h-4 w-20" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-20 w-full rounded-xl" />
      <Skeleton className="mb-2 mt-8 h-4 w-24" />
      <RowsSkeleton rows={3} />
    </PageWrap>
  );
}

/** Document detail — title + toolbar + long prose body. */
export function DocumentDetailSkeleton() {
  return (
    <PageWrap width="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-card p-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3.5", i % 4 === 0 ? "w-1/3" : i % 3 === 0 ? "w-4/6" : "w-full")}
          />
        ))}
      </div>
    </PageWrap>
  );
}

/** Module runner — input column (left) + result/guide area (right). */
export function RunSkeleton() {
  return (
    <PageWrap width="max-w-5xl">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-4/6" />
        </div>
      </div>
    </PageWrap>
  );
}

/** Workflows — KB card + preset cards. */
export function WorkflowsSkeleton() {
  return (
    <PageWrap width="max-w-3xl">
      <HeaderSkeleton />
      <Skeleton className="mb-6 h-20 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-3 w-full" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-16 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrap>
  );
}

/** Manual compose — artifact picker (left) + document editor (right). */
export function ComposeSkeleton() {
  return (
    <PageWrap width="max-w-5xl">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-9 w-full rounded-md" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrap>
  );
}

/** Module editor (prompt builder) — editor column + versions/preview column. */
export function ModuleEditSkeleton() {
  return (
    <PageWrap width="max-w-5xl">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrap>
  );
}

/** Project memory — vertical timeline of artifacts. */
export function MemorySkeleton() {
  return (
    <PageWrap width="max-w-3xl">
      <HeaderSkeleton />
      <ol className="relative ml-2 space-y-4 border-l border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="ml-5">
            <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-muted" />
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </PageWrap>
  );
}

/** AI chat — message stream + composer bar. */
export function ChatSkeleton() {
  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col px-6 py-8">
      <Skeleton className="mb-6 h-6 w-32" />
      <div className="flex-1 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="flex justify-end">
              <Skeleton className="h-10 w-1/2 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-12 w-full rounded-xl" />
    </div>
  );
}

/** Workspace team — member list + invite row. */
export function TeamSkeleton() {
  return (
    <PageWrap width="max-w-3xl">
      <Skeleton className="mb-4 h-4 w-12" />
      <Skeleton className="mb-6 h-7 w-56" />
      <Skeleton className="mb-2 h-4 w-16" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    </PageWrap>
  );
}

/**
 * Visualization placeholder — shown while a diagram-producing module is
 * generating. A loose 2×2 grid hints at the matrix/canvas output to come.
 */
export function VizSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner className="size-3.5" />
        시각화를 그리는 중…
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
