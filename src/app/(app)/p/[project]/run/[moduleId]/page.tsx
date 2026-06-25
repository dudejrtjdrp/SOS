import { notFound } from "next/navigation";
import { getModuleForRun, getKBFields } from "@/lib/queries";
import { ModuleRunner } from "@/components/app/module-runner";
import type { Variable } from "@/core/schemas/variables";

export default async function RunPage({
  params,
}: {
  params: Promise<{ project: string; moduleId: string }>;
}) {
  const { project, moduleId } = await params;
  const data = await getModuleForRun(moduleId);
  if (!data) notFound();
  const kb = await getKBFields(project);

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
    />
  );
}
