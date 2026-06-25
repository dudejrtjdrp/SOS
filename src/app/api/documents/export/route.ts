import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/server/auth";
import { errorResponse } from "@/lib/api";
import { buildDocx } from "@/server/export/docx";
import { buildPptx, deckSectionsFromMarkdown, type DeckSection } from "@/server/export/pptx";

// docx/pptx packing needs the Node runtime (not edge).
export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  documentId: z.string().uuid(),
  format: z.enum(["docx", "pptx"]).default("docx"),
});

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

/** Coerce the stored sections jsonb into the {title, body_md} shape decks need. */
function normalizeSections(raw: unknown): DeckSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const s = (r ?? {}) as Record<string, unknown>;
      return {
        title: typeof s.title === "string" ? s.title : "",
        body_md: typeof s.body_md === "string" ? s.body_md : "",
      };
    })
    .filter((s) => s.title || s.body_md);
}

/** POST /api/documents/export — download a generated document as .docx or .pptx. */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errorResponse("UNAUTHENTICATED", "로그인이 필요합니다.");

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse("VALIDATION", "입력이 올바르지 않습니다.");
  }

  // RLS scopes this read to the user's workspaces — no extra membership check.
  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("title, current_version_id")
    .eq("id", body.documentId)
    .maybeSingle();
  if (!doc) return errorResponse("NOT_FOUND", "문서를 찾을 수 없습니다.");

  const { data: ver } = await ctx.supabase
    .from("document_versions")
    .select("body_md, sections")
    .eq("id", doc.current_version_id)
    .maybeSingle();

  const title = doc.title ?? "문서";
  const bodyMd = ver?.body_md ?? "";

  try {
    let buffer: Buffer;
    if (body.format === "pptx") {
      const sections = normalizeSections(ver?.sections);
      const deck = sections.length > 0 ? sections : deckSectionsFromMarkdown(bodyMd);
      buffer = await buildPptx(title, deck);
    } else {
      buffer = await buildDocx(title, bodyMd);
    }

    const ext = body.format;
    const asciiName =
      title.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "") || "document";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME[body.format],
        "Content-Disposition": `attachment; filename="${asciiName}.${ext}"; filename*=UTF-8''${encodeURIComponent(
          title,
        )}.${ext}`,
      },
    });
  } catch (e) {
    return errorResponse(
      "INTERNAL",
      e instanceof Error ? e.message : "문서 변환에 실패했습니다.",
    );
  }
}
