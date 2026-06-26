import { cn } from "@/lib/utils";

/**
 * Per-tool result indicator. Shows whether a module has saved results in the
 * current project: a filled emerald dot + count when it does, a hollow muted
 * dot when it doesn't. Keeps the module galleries scannable at a glance.
 */
export function ResultStatus({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const has = count > 0;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5", className)}
      title={has ? `저장된 결과 ${count}개` : "저장된 결과 없음"}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          has
            ? "bg-emerald-500 ring-2 ring-emerald-500/20"
            : "border border-muted-foreground/40",
        )}
      />
      {has && (
        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-emerald-600 dark:text-emerald-400">
          {count}개
        </span>
      )}
      <span className="sr-only">
        {has ? `저장된 결과 ${count}개 있음` : "저장된 결과 없음"}
      </span>
    </span>
  );
}
