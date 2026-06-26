import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthContext, workspaceOfProject, isMember } from "@/server/auth";
import { errorResponse } from "@/lib/api";
import { putObject, r2Configured, missingR2Vars } from "@/lib/storage/r2";

export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

/** POST /api/uploads — store a 공고문 file/image in R2, return its object key. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse("UNAUTHENTICATED", "로그인이 필요합니다.");

    if (!r2Configured()) {
      const missing = missingR2Vars().join(", ");
      console.error("[uploads] R2 not configured — missing env vars:", missing);
      return errorResponse(
        "INTERNAL",
        `파일 저장소(R2)가 설정되지 않았어요. 누락된 환경변수: ${missing}. ` +
          `(Vercel → Settings → Environment Variables에 추가 후 재배포)`,
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return errorResponse("VALIDATION", "업로드 형식이 올바르지 않습니다.");
    }

    const projectId = String(form.get("projectId") ?? "");
    const file = form.get("file");
    if (!projectId || !(file instanceof File)) {
      return errorResponse("VALIDATION", "projectId와 파일이 필요합니다.");
    }
    if (file.size === 0) return errorResponse("VALIDATION", "빈 파일입니다.");
    if (file.size > MAX_BYTES) {
      return errorResponse("VALIDATION", "파일이 너무 커요 (최대 25MB).");
    }

    const workspaceId = await workspaceOfProject(ctx.supabase, projectId);
    if (!workspaceId || !(await isMember(ctx.supabase, workspaceId, ctx.user.id))) {
      return errorResponse("FORBIDDEN", "권한이 없습니다.");
    }

    const originalName = file.name || "file";
    const dot = originalName.lastIndexOf(".");
    const ext = dot > -1 ? originalName.slice(dot).replace(/[^.\w]/g, "").slice(0, 12) : "";
    const safeStem = originalName
      .slice(0, dot > -1 ? dot : undefined)
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 60) || "file";
    const key = `notices/${projectId}/${randomUUID()}-${safeStem}${ext}`;
    const mimeType = file.type || "application/octet-stream";

    try {
      const buf = Buffer.from(await file.arrayBuffer());
      await putObject(key, buf, mimeType);
    } catch (e) {
      console.error("[uploads] R2 putObject failed:", e);
      return errorResponse("INTERNAL", e instanceof Error ? e.message : "업로드 실패");
    }

    return NextResponse.json({
      ok: true,
      key,
      fileName: originalName,
      mimeType,
      sizeBytes: file.size,
    });
  } catch (e) {
    // Any unexpected throw (auth, Supabase, runtime) — surface it instead of a bare 500.
    console.error("[uploads] unhandled error:", e);
    return errorResponse(
      "INTERNAL",
      e instanceof Error ? e.message : "업로드 처리 중 오류가 발생했습니다.",
    );
  }
}
