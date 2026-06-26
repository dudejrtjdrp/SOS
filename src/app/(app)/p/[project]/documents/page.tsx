import Link from "next/link";
import { FileTextIcon, DatabaseIcon, PencilLineIcon } from "lucide-react";
import { getDocuments, getDocumentTypes, getKBFields } from "@/lib/queries";
import { kbCompleteness } from "@/core/schemas/kb";
import { DocumentPicker } from "@/components/app/document-picker";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";

export const metadata = { title: "문서" };

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [docs, types, fields] = await Promise.all([
    getDocuments(project),
    getDocumentTypes(),
    getKBFields(project),
  ]);
  const filledKeys = Object.entries(fields)
    .filter(([, v]) => (v ?? "").trim().length > 0)
    .map(([k]) => k);
  const completeness = kbCompleteness(fields);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <RealtimeRefresh table="documents" projectId={project} />
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">문서</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          목적별 문서를 한 번에 생성합니다. 문서는 Knowledge Base와 그동안의 분석을 바탕으로 작성돼요.
        </p>
      </header>

      {/* KB readiness — documents are only as good as the Knowledge Base */}
      <Link
        href={`/p/${project}/knowledge`}
        className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
      >
        <DatabaseIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Knowledge Base 완성도</span>
            <span className="text-muted-foreground">{completeness}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${completeness}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {completeness >= 80
              ? "내용이 충분해요. 아래에서 문서를 생성하세요."
              : "비어 있는 항목이 많을수록 문서가 부실해져요. 먼저 Knowledge Base를 채우는 걸 권장합니다 →"}
          </p>
        </div>
      </Link>

      <div className="mb-3 text-sm font-medium">문서 생성</div>
      <DocumentPicker
        projectId={project}
        docTypes={types as { key: string; name: string; description: string | null }[]}
        filledKeys={filledKeys}
      />

      {/* AI-free alternative: assemble a document from saved tool results by hand. */}
      <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-dashed border-border p-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">직접 조립하기</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            AI 없이 — 도구에서 만든 결과를 골라 순서·내용을 편집해 문서를 만듭니다. 한도 초과 시에도 사용할 수 있어요.
          </p>
        </div>
        <Link
          href={`/p/${project}/documents/compose`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <PencilLineIcon className="size-4" />
          수동 조립
        </Link>
      </div>

      <div className="mt-8">
        <div className="mb-2 text-sm font-medium">생성된 문서</div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 생성된 문서가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Link
                key={d.id as string}
                href={`/p/${project}/documents/${d.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary"
              >
                <FileTextIcon className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium">{d.title as string}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(d.updated_at as string).toLocaleDateString("ko-KR")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
