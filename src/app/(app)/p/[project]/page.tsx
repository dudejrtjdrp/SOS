import Link from "next/link";
import { ChartColumnIcon, FileTextIcon, BookOpenIcon } from "lucide-react";
import { getProject, getKnowledge, getProjectStats, getArtifacts } from "@/lib/queries";
import { kbCompleteness } from "@/core/schemas/kb";
import { ProjectEditButton } from "@/components/app/project-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProjectOverview({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectId } = await params;
  const [project, kb, stats, artifacts] = await Promise.all([
    getProject(projectId),
    getKnowledge(projectId),
    getProjectStats(projectId),
    getArtifacts(projectId, 6),
  ]);
  if (!project) return null;
  const completeness = kbCompleteness(kb.fields);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <ProjectEditButton
            project={{
              id: project.id,
              name: project.name,
              description: project.description ?? null,
            }}
          />
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Knowledge Base 완성도</div>
            <div className="mt-1 text-2xl font-semibold">{completeness}%</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${completeness}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">생성된 결과</div>
            <div className="mt-1 text-2xl font-semibold">{stats.artifactCount}</div>
            <div className="mt-2 text-xs text-muted-foreground">분석·리서치·검증 아티팩트</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="text-sm font-medium">다음 단계</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {completeness < 70
              ? "Knowledge Base를 더 채우면 모든 분석 품질이 올라갑니다."
              : "준비됐어요. 전략 분석을 실행하거나 사업계획서를 생성해보세요."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/p/${projectId}/knowledge`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <BookOpenIcon className="size-4" /> Knowledge Base
            </Link>
            <Link
              href={`/p/${projectId}/analysis`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <ChartColumnIcon className="size-4" /> Analysis 실행
            </Link>
            <Link
              href={`/p/${projectId}/documents`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <FileTextIcon className="size-4" /> 문서 생성
            </Link>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">최근 결과</h2>
      {artifacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 생성된 결과가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {artifacts.map((a) => (
            <div key={a.id as string} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <Badge variant="secondary">{a.kind as string}</Badge>
              <span className="flex-1 truncate text-sm">
                {(a.title as string) ||
                  (a.content_md as string)?.slice(0, 80) ||
                  "결과"}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(a.created_at as string).toLocaleDateString("ko-KR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
