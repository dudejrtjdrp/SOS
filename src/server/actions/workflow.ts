"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";

const GraphSchema = z.object({
  nodes: z.array(z.record(z.unknown())).default([]),
  edges: z.array(z.record(z.unknown())).default([]),
});

export async function saveWorkflow(input: {
  projectId: string;
  name: string;
  graph: z.infer<typeof GraphSchema>;
  workflowId?: string;
}): Promise<Result<{ id: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      graph: GraphSchema,
      workflowId: z.string().uuid().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "워크플로우 이름을 입력하세요.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  if (parsed.data.workflowId) {
    const { error } = await ctx.supabase
      .from("workflows")
      .update({ name: parsed.data.name, graph: parsed.data.graph })
      .eq("id", parsed.data.workflowId);
    if (error) return fail("FORBIDDEN", error.message);
    return ok({ id: parsed.data.workflowId });
  }

  const { data: project } = await ctx.supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", parsed.data.projectId)
    .single();
  if (!project) return fail("NOT_FOUND", "프로젝트를 찾을 수 없습니다.");

  const { data, error } = await ctx.supabase
    .from("workflows")
    .insert({
      workspace_id: project.workspace_id,
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      graph: parsed.data.graph,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("FORBIDDEN", error.message);
  return ok({ id: data.id });
}
