import { notFound } from "next/navigation";
import Link from "next/link";
import { getModulesByCategory, getModuleResultCounts } from "@/lib/queries";
import { getGuide } from "@/core/modules/guide";
import { getViz } from "@/core/viz/registry";
import { ModuleIcon } from "@/components/app/module-icon";
import { ResultStatus } from "@/components/app/result-status";
import { Badge } from "@/components/ui/badge";

const TITLES: Record<string, { title: string; sub: string }> = {
  idea: { title: "Idea Lab", sub: "아이디어 생성 도구" },
  research: { title: "Research", sub: "시장 조사 도구" },
  validation: { title: "Validation", sub: "아이디어 검증 도구" },
  analysis: { title: "Analysis", sub: "전략 분석 프레임워크" },
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ project: string; category: string }>;
}) {
  const { project, category } = await params;
  const meta = TITLES[category];
  if (!meta) notFound();
  const [modules, resultCounts] = await Promise.all([
    getModulesByCategory(category),
    getModuleResultCounts(project),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meta.sub} · 카드를 열면 용도와 필요한 입력을 안내합니다
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modules.map((m) => {
          const g = getGuide(m.key as string | null);
          const count = resultCounts[m.id as string] ?? 0;
          const canViz = getViz(m.key as string | null).length > 0;
          return (
            <Link
              key={m.id as string}
              href={`/p/${project}/run/${m.id}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ModuleIcon name={g.icon} className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{m.name as string}</span>
                    {m.visibility !== "system" && (
                      <Badge variant="outline">
                        {m.visibility === "workspace" ? "팀" : "내 모듈"}
                      </Badge>
                    )}
                    {canViz && (
                      <Badge variant="outline" className="shrink-0 text-[10px] text-primary">
                        시각화
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {g.tagline || (m.description as string)}
                  </p>
                </div>
                <ResultStatus count={count} className="mt-0.5" />
              </div>

              {g.whenToUse && (
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="text-foreground/70">이럴 때 — </span>
                  {g.whenToUse}
                </p>
              )}

              {g.needs.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">필요 입력</span>
                  {g.needs.slice(0, 4).map((n) => (
                    <span
                      key={n}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
