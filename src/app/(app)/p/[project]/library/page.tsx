import Link from "next/link";
import { getLibraryModules, getProject, getModuleResultCounts } from "@/lib/queries";
import { CreateModule } from "@/components/app/create-module";
import { EditPromptButton } from "@/components/app/edit-prompt-button";
import { ResultStatus } from "@/components/app/result-status";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Library" };

const CAT_LABEL: Record<string, string> = {
  idea: "Idea",
  research: "Research",
  validation: "Validation",
  analysis: "Analysis",
  document: "Documents",
  custom: "Custom",
};

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [proj, modules, resultCounts] = await Promise.all([
    getProject(project),
    getLibraryModules(),
    getModuleResultCounts(project),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            프롬프트 모듈을 만들고 편집하세요. 새 기능 = 모듈 하나.
          </p>
        </div>
        {proj && <CreateModule projectId={project} workspaceId={proj.workspace_id} />}
      </header>

      {["analysis", "research", "idea", "validation", "document", "custom"].map((cat) => {
        const items = modules.filter((m) => m.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="mb-7">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">{CAT_LABEL[cat]}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((m) => {
                // User-owned modules edit in place; the whole card opens the builder.
                if (m.visibility !== "system") {
                  return (
                    <Link
                      key={m.id as string}
                      href={`/p/${project}/library/${m.id as string}`}
                      className="rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{m.name as string}</span>
                        {m.visibility === "workspace" ? (
                          <Badge>팀</Badge>
                        ) : (
                          <Badge variant="secondary">내 모듈</Badge>
                        )}
                        <ResultStatus
                          count={resultCounts[m.id as string] ?? 0}
                          className="ml-auto"
                        />
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {(m.description as string) || "편집하려면 클릭"}
                      </p>
                    </Link>
                  );
                }
                // System tools are RLS-immutable: run as-is, or fork-to-edit the prompt.
                return (
                  <div
                    key={m.id as string}
                    className="flex flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary"
                  >
                    <Link href={`/p/${project}/run/${m.id as string}`} className="block">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{m.name as string}</span>
                        <Badge variant="outline">시스템</Badge>
                        <ResultStatus
                          count={resultCounts[m.id as string] ?? 0}
                          className="ml-auto"
                        />
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {(m.description as string) || "실행하려면 클릭"}
                      </p>
                    </Link>
                    <div className="mt-2 flex justify-end">
                      <EditPromptButton
                        projectId={project}
                        moduleId={m.id as string}
                        size="sm"
                        variant="ghost"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
