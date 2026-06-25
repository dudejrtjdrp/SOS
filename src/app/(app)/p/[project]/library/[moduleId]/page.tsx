import { notFound, redirect } from "next/navigation";
import { getModuleForEdit } from "@/lib/queries";
import { PromptBuilder } from "@/components/app/prompt-builder";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ project: string; moduleId: string }>;
}) {
  const { project, moduleId } = await params;
  const data = await getModuleForEdit(moduleId);
  if (!data || !data.templateId) notFound();
  // System modules are read-only — send to the runner instead.
  if (data.module.visibility === "system") redirect(`/p/${project}/run/${moduleId}`);

  return (
    <PromptBuilder
      projectId={project}
      moduleId={moduleId}
      templateId={data.templateId}
      workspaceId={data.workspaceId ?? ""}
      moduleName={data.module.name}
      visibility={data.module.visibility}
      outputKind={data.outputKind}
      current={data.current}
      versions={data.versions}
    />
  );
}
