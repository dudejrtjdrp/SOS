import { getMemory } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Project Memory" };

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const { artifacts, edges } = await getMemory(project);

  const cites: Record<string, number> = {};
  edges.forEach((e) => {
    if (e.relation === "cites") cites[e.from_id] = (cites[e.from_id] ?? 0) + 1;
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Project Memory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          지금까지 생성한 모든 결과의 연결망. 결과는 서로를 인용하며 맥락을 쌓아갑니다.
        </p>
      </header>

      {artifacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 기록이 없습니다. 모듈을 실행하면 여기에 쌓입니다.
        </p>
      ) : (
        <ol className="relative ml-2 space-y-4 border-l border-border">
          {artifacts.map((a) => (
            <li key={a.id as string} className="ml-5">
              <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-primary" />
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{a.kind as string}</Badge>
                  <span className="flex-1 truncate text-sm">
                    {(a.title as string) || "결과"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at as string).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                {cites[a.id as string] ? (
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    출처 {cites[a.id as string]}개 인용 (RAG)
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
