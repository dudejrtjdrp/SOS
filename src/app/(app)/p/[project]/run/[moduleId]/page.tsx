import { notFound } from "next/navigation";
import { getModuleForRun, getKBFields, getModuleArtifacts } from "@/lib/queries";
import { ModuleRunner } from "@/components/app/module-runner";
import type { SavedArtifact } from "@/components/app/saved-results";
import type { Variable } from "@/core/schemas/variables";
import type { VerificationStatus } from "@/types/db";

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string; moduleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, moduleId } = await params;
  const sp = await searchParams;
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

  const variables = data.variables as Variable[];
  // Prefill text inputs from query params — e.g. when opened from the 공고문
  // ‘행사 정보’ panel, which passes 행사명·행사 주제·비고 in the URL.
  const initialValues: Record<string, string> = {};
  for (const v of variables) {
    if (v.type !== "text" && v.type !== "textarea") continue;
    const raw = sp[v.key];
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (typeof val === "string" && val.trim()) initialValues[v.key] = val;
  }

  return (
    <ModuleRunner
      projectId={project}
      moduleId={moduleId}
      moduleKey={(data.module as { key?: string | null }).key ?? null}
      moduleName={data.module.name}
      description={data.module.description}
      variables={variables}
      outputKind={data.outputKind}
      kb={kb}
      saved={saved}
      initialValues={initialValues}
    />
  );
}
