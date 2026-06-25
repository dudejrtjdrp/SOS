import { getArtifactsForCompose } from "@/lib/queries";
import { DocumentComposer } from "@/components/app/document-composer";

export const metadata = { title: "문서 조립" };

export default async function ComposePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const artifacts = await getArtifactsForCompose(project);
  return <DocumentComposer projectId={project} artifacts={artifacts} />;
}
