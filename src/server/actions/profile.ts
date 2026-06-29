"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";

/**
 * Update the signed-in user's own display name.
 *
 * RLS `profiles_update = (id = auth.uid())` already restricts writes to the
 * caller's own row, so we just target `id = ctx.user.id`. We ask for the row
 * back so a 0-row update surfaces as an error instead of a silent no-op. The
 * name shows in sidebars, the home header and the team page, so we revalidate
 * the whole app layout tree.
 */
export async function updateProfile(input: { displayName: string }): Promise<Result> {
  const parsed = z
    .object({
      displayName: z
        .string()
        .min(1, "이름을 입력하세요.")
        .max(40, "이름은 40자 이내로 입력하세요."),
    })
    .safeParse({ displayName: input.displayName?.trim() });
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "잘못된 요청입니다.");
  }

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", ctx.user.id)
    .select("id")
    .maybeSingle();
  if (error) return fail("INTERNAL", error.message);
  if (!data) return fail("INTERNAL", "이름을 변경하지 못했습니다.");

  revalidatePath("/", "layout");
  return ok(undefined);
}
