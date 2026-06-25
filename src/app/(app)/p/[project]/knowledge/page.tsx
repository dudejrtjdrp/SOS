import { getKnowledge } from "@/lib/queries";
import { KBEditor, AddKnowledgeEntry } from "@/components/app/kb-editor";

export const metadata = { title: "Knowledge Base" };

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const { fields, entries } = await getKnowledge(project);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          프로젝트의 단일 진실. 모든 AI가 이 정보를 참조하며, 같은 내용을 다시 입력할
          필요가 없습니다.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <KBEditor projectId={project} initial={fields} />

        <aside>
          <h2 className="mb-2 text-sm font-medium">자료 (RAG)</h2>
          <AddKnowledgeEntry projectId={project} />
          <div className="mt-4 space-y-2">
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                업로드·메모를 추가하면 근거 기반 생성에 활용됩니다.
              </p>
            ) : (
              entries.map((e) => (
                <div key={e.id as string} className="rounded-lg border border-border p-3">
                  <div className="truncate text-sm">{(e.title as string) || "무제"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {e.source_type as string} ·{" "}
                    {new Date(e.created_at as string).toLocaleDateString("ko-KR")}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
