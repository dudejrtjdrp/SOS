"use server";

import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";

export async function createWorkspace(input: { name: string }): Promise<Result<{ id: string }>> {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "워크스페이스 이름을 입력하세요.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data, error } = await ctx.supabase.rpc("create_workspace", { p_name: parsed.data.name });
  if (error) return fail("INTERNAL", error.message);
  return ok({ id: data as string });
}

export async function inviteMember(input: {
  workspaceId: string;
  email: string;
  role?: "owner" | "member";
}): Promise<Result<{ inviteId: string; token: string }>> {
  const parsed = z
    .object({
      workspaceId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(["owner", "member"]).default("member"),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "이메일을 확인하세요.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  // RLS: only owners can insert invites.
  const { data, error } = await ctx.supabase
    .from("workspace_invites")
    .insert({
      workspace_id: parsed.data.workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: ctx.user.id,
    })
    .select("id, token")
    .single();
  if (error) return fail("FORBIDDEN", error.message);
  return ok({ inviteId: data.id, token: data.token });
}

export async function acceptInvite(input: { token: string }): Promise<Result<{ workspaceId: string }>> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { data, error } = await ctx.supabase.rpc("accept_invite", { p_token: input.token });
  if (error) return fail("VALIDATION", "유효하지 않거나 만료된 초대입니다.");
  return ok({ workspaceId: data as string });
}

export async function updateMemberRole(input: {
  workspaceId: string;
  userId: string;
  role: "owner" | "member";
}): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("workspace_members")
    .update({ role: input.role })
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}

export async function removeMember(input: { workspaceId: string; userId: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}
