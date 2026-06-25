import { NextResponse, type NextRequest } from "next/server";
import { getAuthContext } from "@/server/auth";
import { errorResponse } from "@/lib/api";
import { ReviewInput } from "@/core/schemas";
import { runReview } from "@/server/reviewer";

export const maxDuration = 120;

/** POST /api/reviews — multi-persona AI review (docs/04 §4.4). */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errorResponse("UNAUTHENTICATED", "로그인이 필요합니다.");

  let body;
  try {
    body = ReviewInput.parse(await req.json());
  } catch {
    return errorResponse("VALIDATION", "입력이 올바르지 않습니다.");
  }

  try {
    // RLS ensures the user can only read targets in their workspaces.
    const reviews = await runReview(ctx.supabase, ctx.user.id, {
      targetType: body.targetType,
      targetId: body.targetId,
      personas: body.personas,
    });
    return NextResponse.json({ ok: true, reviews });
  } catch (e) {
    return errorResponse(
      "PROVIDER_ERROR",
      e instanceof Error ? e.message : "리뷰 생성 실패",
      true,
    );
  }
}
