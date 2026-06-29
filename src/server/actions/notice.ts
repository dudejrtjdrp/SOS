"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext, workspaceOfProject } from "@/server/auth";
import { ok, fail, type Result } from "@/lib/result";
import { deleteObject } from "@/lib/storage/r2";

const kindEnum = z.enum(["file", "image", "link"]);
const statusEnum = z.enum(["open", "preparing", "submitted", "closed"]);
const deadlineSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "마감일 형식이 올바르지 않습니다.")
  .nullable()
  .optional();

export async function createNotice(input: {
  projectId: string;
  title: string;
  kind: "file" | "image" | "link";
  url?: string | null;
  storageKey?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  description?: string | null;
  deadline?: string | null;
  status?: "open" | "preparing" | "submitted" | "closed";
  tags?: string[];
}): Promise<Result<{ id: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      title: z.string().trim().min(1, "제목을 입력하세요."),
      kind: kindEnum,
      url: z.string().url("링크 주소가 올바르지 않습니다.").nullable().optional(),
      storageKey: z.string().nullable().optional(),
      fileName: z.string().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      sizeBytes: z.number().int().nonnegative().nullable().optional(),
      description: z.string().nullable().optional(),
      deadline: deadlineSchema,
      status: statusEnum.optional(),
      tags: z.array(z.string()).optional(),
    })
    .refine((d) => (d.kind === "link" ? !!d.url : !!d.storageKey), {
      message: "링크는 URL, 파일·이미지는 업로드가 필요합니다.",
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "입력을 확인하세요.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const workspaceId = await workspaceOfProject(ctx.supabase, parsed.data.projectId);
  if (!workspaceId) return fail("NOT_FOUND", "프로젝트를 찾을 수 없습니다.");

  const d = parsed.data;
  const { data, error } = await ctx.supabase
    .from("notices")
    .insert({
      workspace_id: workspaceId,
      project_id: d.projectId,
      title: d.title,
      kind: d.kind,
      url: d.url ?? null,
      storage_key: d.storageKey ?? null,
      file_name: d.fileName ?? null,
      mime_type: d.mimeType ?? null,
      size_bytes: d.sizeBytes ?? null,
      description: d.description ?? null,
      deadline: d.deadline ?? null,
      status: d.status ?? "open",
      tags: d.tags ?? [],
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail("INTERNAL", error?.message ?? "공고문 저장에 실패했습니다.");

  revalidatePath(`/p/${d.projectId}/notices`);
  return ok({ id: data.id as string });
}

export async function updateNotice(input: {
  noticeId: string;
  projectId: string;
  title?: string;
  description?: string | null;
  deadline?: string | null;
  status?: "open" | "preparing" | "submitted" | "closed";
  tags?: string[];
  pinned?: boolean;
}): Promise<Result> {
  const parsed = z
    .object({
      noticeId: z.string().uuid(),
      projectId: z.string().uuid(),
      title: z.string().trim().min(1).optional(),
      description: z.string().nullable().optional(),
      deadline: deadlineSchema,
      status: statusEnum.optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "입력을 확인하세요.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const patch: Record<string, unknown> = { updated_by: ctx.user.id };
  const d = parsed.data;
  if (d.title !== undefined) patch.title = d.title;
  if (d.description !== undefined) patch.description = d.description;
  if (d.deadline !== undefined) patch.deadline = d.deadline;
  if (d.status !== undefined) patch.status = d.status;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.pinned !== undefined) patch.pinned = d.pinned;

  const { error } = await ctx.supabase.from("notices").update(patch).eq("id", d.noticeId);
  if (error) return fail("INTERNAL", error.message);

  revalidatePath(`/p/${d.projectId}/notices`);
  return ok(undefined);
}

export async function deleteNotice(input: {
  noticeId: string;
  projectId: string;
  storageKey?: string | null;
}): Promise<Result> {
  const parsed = z
    .object({
      noticeId: z.string().uuid(),
      projectId: z.string().uuid(),
      storageKey: z.string().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "입력이 올바르지 않습니다.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const { error } = await ctx.supabase.from("notices").delete().eq("id", parsed.data.noticeId);
  if (error) return fail("INTERNAL", error.message);

  // Best-effort object cleanup (ignored if R2 unconfigured or already gone).
  if (parsed.data.storageKey) await deleteObject(parsed.data.storageKey);

  revalidatePath(`/p/${parsed.data.projectId}/notices`);
  return ok(undefined);
}

/**
 * Replace a 공고문 file attachment with an edited version (e.g. a .hwpx exported
 * from the in-app 한글 editor). Updates the storage pointer + metadata and best-
 * effort deletes the previous object. The old key is read from the row (not the
 * client) so a caller can't be tricked into deleting an arbitrary object.
 */
export async function replaceNoticeFile(input: {
  noticeId: string;
  projectId: string;
  storageKey: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  /** Accepted for client convenience but ignored — the old key comes from the DB. */
  oldStorageKey?: string | null;
}): Promise<Result> {
  const parsed = z
    .object({
      noticeId: z.string().uuid(),
      projectId: z.string().uuid(),
      storageKey: z.string().min(1, "저장 키가 필요합니다."),
      fileName: z.string().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      sizeBytes: z.number().int().nonnegative().nullable().optional(),
      oldStorageKey: z.string().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "입력을 확인하세요.");

  const ctx = await getAuthContext();
  if (!ctx) return fail("UNAUTHENTICATED", "로그인이 필요합니다.");

  const d = parsed.data;
  const workspaceId = await workspaceOfProject(ctx.supabase, d.projectId);
  if (!workspaceId) return fail("NOT_FOUND", "프로젝트를 찾을 수 없습니다.");

  // Read the current object key (and confirm the notice belongs to this project).
  const { data: cur, error: readErr } = await ctx.supabase
    .from("notices")
    .select("storage_key")
    .eq("id", d.noticeId)
    .eq("project_id", d.projectId)
    .single();
  if (readErr || !cur) return fail("NOT_FOUND", "공고문을 찾을 수 없습니다.");

  const { error } = await ctx.supabase
    .from("notices")
    .update({
      kind: "file",
      storage_key: d.storageKey,
      file_name: d.fileName ?? null,
      mime_type: d.mimeType ?? null,
      size_bytes: d.sizeBytes ?? null,
      updated_by: ctx.user.id,
    })
    .eq("id", d.noticeId)
    .eq("project_id", d.projectId);
  if (error) return fail("INTERNAL", error.message);

  // Best-effort cleanup of the replaced object (ignored if unconfigured / gone).
  const prevKey = (cur as { storage_key: string | null }).storage_key;
  if (prevKey && prevKey !== d.storageKey) await deleteObject(prevKey);

  revalidatePath(`/p/${d.projectId}/notices`);
  return ok(undefined);
}
