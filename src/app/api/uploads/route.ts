import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthContext, workspaceOfProject, isMember } from "@/server/auth";
import { errorResponse } from "@/lib/api";
import { putObject, getObject, r2Configured, missingR2Vars } from "@/lib/storage/r2";

export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

// Object keys are always "notices/<projectId>/<uuid>-<name>.<ext>" (see POST).
const NOTICE_KEY_RE = /^notices\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/[^/]+$/;

/**
 * GET /api/uploads?key=notices/<projectId>/... — same-origin file proxy.
 *
 * Streams a stored 공고문 file back through our origin so the 한글(.hwp) 뷰어 can
 * read the raw bytes without a cross-origin fetch to R2 (no bucket CORS needed),
 * while still enforcing project membership. Other types use the presigned URL
 * directly, but this also works as an authenticated inline fallback.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse("UNAUTHENTICATED", "로그인이 필요합니다.");

    const key = req.nextUrl.searchParams.get("key") ?? "";
    const m = NOTICE_KEY_RE.exec(key);
    if (!m || key.includes("..")) return errorResponse("VALIDATION", "잘못된 파일 경로입니다.");

    const projectId = m[1];
    const workspaceId = await workspaceOfProject(ctx.supabase, projectId);
    if (!workspaceId || !(await isMember(ctx.supabase, workspaceId, ctx.user.id))) {
      return errorResponse("FORBIDDEN", "권한이 없습니다.");
    }

    if (!r2Configured()) {
      return errorResponse("INTERNAL", "파일 저장소(R2)가 설정되지 않았습니다.");
    }

    let upstream: Response | null;
    try {
      upstream = await getObject(key);
    } catch (e) {
      console.error("[uploads:GET] R2 fetch failed:", e);
      return errorResponse("INTERNAL", "파일을 불러오지 못했습니다.");
    }
    if (!upstream || !upstream.body) return errorResponse("NOT_FOUND", "파일을 찾을 수 없습니다.");

    const headers = new Headers();
    headers.set("content-type", upstream.headers.get("content-type") || "application/octet-stream");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("content-length", len);
    headers.set("content-disposition", "inline");
    headers.set("cache-control", "private, max-age=300");
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (e) {
    console.error("[uploads:GET] unhandled error:", e);
    return errorResponse("INTERNAL", e instanceof Error ? e.message : "파일 요청 처리 중 오류가 발생했습니다.");
  }
}

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
