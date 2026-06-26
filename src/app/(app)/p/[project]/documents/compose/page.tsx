import { getArtifactsForCompose, getModuleIdsByKeys } from "@/lib/queries";
import { documentModules } from "@/core/modules/seed/documents";
import { ComposeWorkspace } from "@/components/app/compose-workspace";

export const metadata = { title: "문서 직접 조립" };

export default async function ComposePage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { project } = await params;
  const sp = await searchParams;
  const initialDoc = typeof sp?.doc === "string" ? sp.doc : null;

  // Document templates → the "items" the user can target (each section maps to a
  // tool via module_key). Static seed data, shaped to plain serializable props.
  const docTemplates = documentModules.map((d) => ({
    key: d.key,
    name: d.name,
    sections: (d.doc_sections ?? []).map((s) => ({
      title: s.title,
      moduleKey: s.module_key ?? null,
    })),
  }));

  const allKeys = [
    ...new Set(
      docTemplates.flatMap((d) => d.sections.map((s) => s.moduleKey).filter(Boolean) as string[]),
    ),
  ];

  const [artifacts, idMap] = await Promise.all([
    getArtifactsForCompose(project),
    getModuleIdsByKeys(allKeys),
  ]);

  return (
    <ComposeWorkspace
      projectId={project}
      artifacts={artifacts}
      docTemplates={docTemplates}
      idMap={idMap}
      initialDoc={initialDoc}
    />
  );
}
