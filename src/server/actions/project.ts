"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";

export async function createProject(input: {
  workspaceId: string;
  name: string;
  description?: string;
}): Promise<Result<{ id: string }>> {
  const parsed = z
    .object({
      workspaceId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "프로젝트 이름을 입력하세요.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data: project, error } = await ctx.supabase
    .from("projects")
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return fail("FORBIDDEN", error.message);

  // Every project carries exactly one Knowledge Base.
  const { error: kbError } = await ctx.supabase.from("knowledge_bases").insert({
    project_id: project.id,
    workspace_id: parsed.data.workspaceId,
    fields: { project_name: parsed.data.name },
  });
  if (kbError) return fail("INTERNAL", kbError.message);

  return ok({ id: project.id });
}

export async function archiveProject(input: { projectId: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("projects")
    .update({ status: "archived" })
    .eq("id", input.projectId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

export async function renameProject(input: { projectId: string; name: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("projects")
    .update({ name: input.name })
    .eq("id", input.projectId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/** Restore an archived project back to the active list. */
export async function unarchiveProject(input: { projectId: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("projects")
    .update({ status: "active" })
    .eq("id", input.projectId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

/**
 * Permanently delete a project. Every child table (knowledge, artifacts, runs,
 * documents, …) references projects with `on delete cascade`, so this removes
 * all associated data. RLS (projects_write = is_member) gates who can do it.
 */
export async function deleteProject(input: { projectId: string }): Promise<Result> {
  const parsed = z.object({ projectId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "잘못된 요청입니다.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data.projectId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}
