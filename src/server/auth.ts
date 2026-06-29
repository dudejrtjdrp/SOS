import "server-only";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * The signed-in user, validated against the Supabase auth server.
 *
 * `auth.getUser()` is a NETWORK round-trip, and without this it runs once per
 * layout + page in the same render (middleware, (app) layout, project layout,
 * page) — the dominant per-navigation latency. React `cache()` dedupes every
 * call within a single request down to ONE network call.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The signed-in user's display name from their profile row, or null if unset.
 * Request-cached so the sidebars/header that all show it share one read. Falls
 * back to null (callers show the email) when there's no name yet.
 */
export const getMyDisplayName = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  return data?.display_name ?? null;
});

/** Returns the authed context or null if not signed in. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  // createClient() only reads cookies + builds the client (no network), so this
  // is cheap; the expensive getUser() above is cached per request.
  const supabase = await createClient();
  return { supabase, user };
}

/** Membership check used by actions/handlers (RLS is the real guard). */
export async function isMember(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** Resolve the workspace_id that owns a project (for budget + authz). */
export async function workspaceOfProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

/** True if the workspace is still within its monthly token budget. */
export async function withinBudget(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("workspaces")
    .select("tokens_used_current, token_budget_monthly")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!data) return true;
  return data.tokens_used_current < data.token_budget_monthly;
}
