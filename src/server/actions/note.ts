"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, workspaceOfProject } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";

const fieldsSchema = z.record(z.string(), z.string());

/** Create an empty note of a given template type; the editor fills it in. */
export async function createNote(input: {
  projectId: string;
  noteType: string;
  title?: string;
}): Promise<Result<{ id: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      noteType: z.string().min(1),
      title: z.string().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const workspaceId = await workspaceOfProject(ctx.supabase, parsed.data.projectId);
  if (!workspaceId) return fail("NOT_FOUND", "프로젝트를 찾을 수 없습니다.");

  const { data, error } = await ctx.supabase
    .from("notes")
    .insert({
      workspace_id: workspaceId,
      project_id: parsed.data.projectId,
      note_type: parsed.data.noteType,
      title: parsed.data.title ?? "",
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail("INTERNAL", error?.message ?? "노트 생성에 실패했습니다.");

  revalidatePath(`/p/${parsed.data.projectId}/notes`);
  return ok({ id: data.id as string });
}

/** Save the note (explicit save button). RLS guards membership. */
export async function updateNote(input: {
  noteId: string;
  projectId: string;
  title?: string;
  fields?: Record<string, string>;
  body_md?: string;
  tags?: string[];
  pinned?: boolean;
}): Promise<Result<{ updatedAt: string }>> {
  const parsed = z
    .object({
      noteId: z.string().uuid(),
      projectId: z.string().uuid(),
      title: z.string().optional(),
      fields: fieldsSchema.optional(),
      body_md: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const patch: Record<string, unknown> = { updated_by: ctx.user.id };
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.fields !== undefined) patch.fields = parsed.data.fields;
  if (parsed.data.body_md !== undefined) patch.body_md = parsed.data.body_md;
  if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;
  if (parsed.data.pinned !== undefined) patch.pinned = parsed.data.pinned;

  const { data, error } = await ctx.supabase
    .from("notes")
    .update(patch)
    .eq("id", parsed.data.noteId)
    .select("updated_at")
    .single();
  if (error || !data) return fail("INTERNAL", error?.message ?? "저장에 실패했습니다.");

  revalidatePath(`/p/${parsed.data.projectId}/notes`);
  revalidatePath(`/p/${parsed.data.projectId}/notes/${parsed.data.noteId}`);
  return ok({ updatedAt: data.updated_at as string });
}

export async function deleteNote(input: {
  noteId: string;
  projectId: string;
}): Promise<Result> {
  const parsed = z
    .object({ noteId: z.string().uuid(), projectId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { error } = await ctx.supabase.from("notes").delete().eq("id", parsed.data.noteId);
  if (error) return fail("INTERNAL", error.message);

  revalidatePath(`/p/${parsed.data.projectId}/notes`);
  return ok(undefined);
}
