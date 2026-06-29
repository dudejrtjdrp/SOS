"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, workspaceOfProject } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";

/**
 * 행사 정보 (project-level event brief) — exactly one row per project.
 * Upserts on project_id so the same brief is edited in place; used to seed the
 * Idea Lab "출품·참가 아이디어" tool from the 공고문 page.
 */
export async function upsertProjectEvent(input: {
  projectId: string;
  eventName?: string;
  eventTopic?: string;
  note?: string;
}): Promise<Result> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      eventName: z.string().max(200, "행사명이 너무 깁니다.").optional(),
      eventTopic: z.string().max(300, "행사 주제가 너무 깁니다.").optional(),
      note: z.string().max(2000, "비고가 너무 깁니다.").optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "입력을 확인하세요.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const workspaceId = await workspaceOfProject(ctx.supabase, parsed.data.projectId);
  if (!workspaceId) return fail("NOT_FOUND", "프로젝트를 찾을 수 없습니다.");

  const d = parsed.data;
  const { error } = await ctx.supabase.from("project_events").upsert(
    {
      workspace_id: workspaceId,
      project_id: d.projectId,
      event_name: (d.eventName ?? "").trim(),
      event_topic: (d.eventTopic ?? "").trim(),
      note: (d.note ?? "").trim(),
      updated_by: ctx.user.id,
    },
    { onConflict: "project_id" },
  );
  if (error) return fail("INTERNAL", error.message);

  revalidatePath(`/p/${d.projectId}/notices`);
  return ok(undefined);
}
