import { notFound } from "next/navigation";
import { getModuleForRun, getKBFields, getModuleArtifacts } from "@/lib/queries";
import { ModuleRunner } from "@/components/app/module-runner";
import type { SavedArtifact } from "@/components/app/saved-results";
import type { Variable } from "@/core/schemas/variables";
import type { VerificationStatus } from "@/types/db";

export default async function RunPage({
  params,
}: {
  params: Promise<{ project: string; moduleId: string }>;
}) {
  const { project, moduleId } = await params;
  const data = await getModuleForRun(moduleId);
  if (!data) notFound();
  const [kb, savedRows] = await Promise.all([
    getKBFields(project),
    getModuleArtifacts(project, moduleId),
  ]);
  const saved: SavedArtifact[] = savedRows.map((a) => ({
    id: a.id as string,
    content: a.content,
    contentMd: (a.content_md as string | null) ?? null,
    status: a.verification_status as VerificationStatus,
    founderTake: (a.founder_take as string | null) ?? null,
    createdAt: a.created_at as string,
    pinned: !!a.pinned,
  }));

  return (
    <ModuleRunner
      projectId={project}
      moduleId={moduleId}
      moduleKey={(data.module as { key?: string | null }).key ?? null}
      moduleName={data.module.name}
      description={data.module.description}
      variables={data.variables as Variable[]}
      outputKind={data.outputKind}
      kb={kb}
      saved={saved}
    />
  );
}
