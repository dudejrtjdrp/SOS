"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
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

/**
 * Update a workspace's name and/or settings (plan, monthly token budget).
 * RLS `workspaces_update = is_owner`, so only owners can change these. Only the
 * fields actually provided are written, so partial updates are safe.
 */
export async function updateWorkspace(input: {
  workspaceId: string;
  name?: string;
  plan?: "free" | "pro" | "team";
  tokenBudgetMonthly?: number;
}): Promise<Result> {
  const parsed = z
    .object({
      workspaceId: z.string().uuid(),
      name: z.string().min(1, "워크스페이스 이름을 입력하세요.").max(80).optional(),
      plan: z.enum(["free", "pro", "team"]).optional(),
      tokenBudgetMonthly: z.number().int().min(0).max(1_000_000_000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "잘못된 요청입니다.");
  }
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.plan !== undefined) patch.plan = parsed.data.plan;
  if (parsed.data.tokenBudgetMonthly !== undefined)
    patch.token_budget_monthly = parsed.data.tokenBudgetMonthly;
  if (Object.keys(patch).length === 0) return ok(undefined);

  // RLS gates owners only. Ask for the row back so a 0-row update (e.g. a
  // non-owner blocked by RLS) surfaces as an error instead of a silent no-op.
  const { data, error } = await ctx.supabase
    .from("workspaces")
    .update(patch)
    .eq("id", parsed.data.workspaceId)
    .select("id")
    .maybeSingle();
  if (error) return fail("FORBIDDEN", error.message);
  if (!data) return fail("FORBIDDEN", "워크스페이스를 수정할 권한이 없습니다.");

  revalidatePath("/home");
  revalidatePath(`/w/${parsed.data.workspaceId}/team`);
  return ok(undefined);
}

/**
 * Add a teammate by email — no invite link, no acceptance step.
 *
 * Calls the `add_member_by_email` RPC (security definer), which:
 *   • email already has an SOS account → inserts into workspace_members
 *     immediately (status "added") — they're a member right away.
 *   • email not registered yet → stores a pending invite (status "invited");
 *     the `handle_new_user` trigger auto-joins them the moment they sign up
 *     with that email. Still no link to open.
 */
export async function addMember(input: {
  workspaceId: string;
  email: string;
  role?: "owner" | "member";
}): Promise<Result<{ status: "added" | "invited" }>> {
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

  const { data, error } = await ctx.supabase.rpc("add_member_by_email", {
    p_workspace_id: parsed.data.workspaceId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) return fail("FORBIDDEN", error.message);
  const status = (data as { status?: string })?.status === "added" ? "added" : "invited";
  return ok({ status });
}

/**
 * @deprecated 구버전 링크 호환용. 새 흐름은 addMember 를 쓴다.
 * 이메일로 토큰 초대 행을 만들고 token 을 돌려준다(/join?token 링크 생성용).
 */
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

/**
 * Permanently delete a workspace and everything in it. All workspace-scoped
 * tables reference workspaces with `on delete cascade`, so projects, knowledge,
 * documents, members and invites are removed too. RLS (workspaces_delete =
 * is_owner) ensures only an owner can do this.
 */
export async function deleteWorkspace(input: { workspaceId: string }): Promise<Result> {
  const parsed = z.object({ workspaceId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "잘못된 요청입니다.");
  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");
  const { error } = await ctx.supabase
    .from("workspaces")
    .delete()
    .eq("id", parsed.data.workspaceId);
  if (error) return fail("FORBIDDEN", error.message);
  return ok(undefined);
}
