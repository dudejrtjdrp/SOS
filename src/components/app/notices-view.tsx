"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PlusIcon,
  LinkIcon,
  UploadIcon,
  FileIcon,
  ImageIcon,
  ExternalLinkIcon,
  DownloadIcon,
  Trash2Icon,
  PinIcon,
  Loader2Icon,
  SearchIcon,
  PencilIcon,
  XIcon,
  EyeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createNotice, updateNotice, deleteNotice } from "@/server/actions/notice";
import { useRealtimeRefresh } from "@/lib/realtime";
import {
  NOTICE_STATUS,
  statusLabel,
  dDayLabel,
  dDay,
  previewKind,
  isPreviewable,
  previewLabel,
  type NoticeStatus,
} from "@/core/notices/meta";
import { NoticeViewer } from "@/components/app/notice-viewer";
import { cn } from "@/lib/utils";

interface NoticeRow {
  id: string;
  project_id: string;
  title: string;
  kind: "file" | "image" | "link";
  url: string | null;
  storage_key: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  description: string | null;
  deadline: string | null;
  status: string;
  tags: string[] | null;
  pinned: boolean | null;
  created_at: string;
  fileUrl: string | null;
}

const STATUS_TONE: Record<string, string> = {
  open: "border-border text-muted-foreground",
  preparing: "border-primary/40 bg-primary/10 text-foreground",
  submitted: "border-[var(--success)]/40 bg-[var(--success)]/10 text-foreground",
  closed: "border-border bg-muted/40 text-muted-foreground",
};

export function NoticesView({
  projectId,
  notices,
}: {
  projectId: string;
  notices: NoticeRow[];
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"none" | "link" | "upload">("none");
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [filter, setFilter] = React.useState<string>("all");
  const [q, setQ] = React.useState("");

  useRealtimeRefresh({ table: "notices", projectId, onChange: () => router.refresh() });

  function resetForm() {
    setTitle("");
    setUrl("");
    setDeadline("");
    setFile(null);
    setMode("none");
  }

  async function addLink() {
    if (!title.trim() || !url.trim()) {
      toast.error("제목과 링크 주소를 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const r = await createNotice({
        projectId,
        title: title.trim(),
        kind: "link",
        url: url.trim(),
        deadline: deadline || null,
      });
      if (!r.ok) return toast.error(r.error.message ?? "추가에 실패했어요.");
      toast.success("공고문을 추가했어요.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("추가 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function addUpload() {
    if (!title.trim() || !file) {
      toast.error("제목과 파일을 선택하세요.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("file", file);
      const up = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await up.json().catch(() => null);
      if (!up.ok || !j?.key) {
        toast.error(j?.error?.message ?? "업로드에 실패했어요.");
        return;
      }
      const isImage = String(j.mimeType ?? "").startsWith("image/");
      const r = await createNotice({
        projectId,
        title: title.trim(),
        kind: isImage ? "image" : "file",
        storageKey: j.key,
        fileName: j.fileName,
        mimeType: j.mimeType,
        sizeBytes: j.sizeBytes,
        deadline: deadline || null,
      });
      if (!r.ok) return toast.error(r.error.message ?? "추가에 실패했어요.");
      toast.success("공고문을 추가했어요.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("업로드 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of notices) c[n.status] = (c[n.status] ?? 0) + 1;
    return c;
  }, [notices]);

  const visible = notices.filter((n) => {
    if (filter !== "all" && n.status !== filter) return false;
    if (q.trim()) {
      const hay = `${n.title} ${n.description ?? ""} ${(n.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">공고문</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            지원사업·공모전 공고를 파일·이미지·링크로 모아두고 마감일과 진행 상태를 관리하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "link" ? "secondary" : "outline"}
            onClick={() => setMode(mode === "link" ? "none" : "link")}
          >
            <LinkIcon className="size-4" />
            링크
          </Button>
          <Button
            size="sm"
            variant={mode === "upload" ? "secondary" : "default"}
            onClick={() => setMode(mode === "upload" ? "none" : "upload")}
          >
            <UploadIcon className="size-4" />
            파일·이미지
          </Button>
        </div>
      </header>

      {mode !== "none" && (
        <div className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공고명 (예: 2026 예비창업패키지)"
          />
          {mode === "link" ? (
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          ) : (
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80"
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              마감일
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button
              size="sm"
              className="ml-auto"
              onClick={mode === "link" ? addLink : addUpload}
              disabled={busy}
            >
              {busy ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
              추가
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm} disabled={busy}>
              취소
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공고명·설명 검색" className="pl-8" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <StatusChip label="전체" count={notices.length} active={filter === "all"} onClick={() => setFilter("all")} />
        {NOTICE_STATUS.map((s) => (
          <StatusChip
            key={s.key}
            label={s.label}
            count={counts[s.key] ?? 0}
            active={filter === s.key}
            onClick={() => setFilter(s.key)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {notices.length === 0
            ? "아직 공고문이 없어요. 위에서 링크나 파일·이미지를 추가하세요."
            : "조건에 맞는 공고문이 없어요."}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((n) => (
            <NoticeCard key={n.id} notice={n} projectId={projectId} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoticeCard({
  notice: n,
  projectId,
  onChanged,
}: {
  notice: NoticeRow;
  projectId: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(n.title);
  const [desc, setDesc] = React.useState(n.description ?? "");
  const [deadline, setDeadline] = React.useState(n.deadline ?? "");
  const [busy, setBusy] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);

  const dlabel = dDayLabel(n.deadline);
  const dleft = dDay(n.deadline);
  const urgent = dleft != null && dleft >= 0 && dleft <= 3 && n.status !== "submitted" && n.status !== "closed";

  const pk = previewKind({ kind: n.kind, mimeType: n.mime_type, fileName: n.file_name });
  const canPreview = isPreviewable(pk);
  const typeLabel = previewLabel(pk);
  const typeIcon =
    n.kind === "link" ? <LinkIcon className="size-5" /> : n.kind === "image" ? <ImageIcon className="size-5" /> : <FileIcon className="size-5" />;

  async function patch(p: Parameters<typeof updateNotice>[0]) {
    setBusy(true);
    try {
      const r = await updateNotice(p);
      if (!r.ok) return toast.error(r.error.message ?? "수정에 실패했어요.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    await patch({
      noticeId: n.id,
      projectId,
      title: title.trim() || n.title,
      description: desc,
      deadline: deadline || null,
    });
    setEditing(false);
    toast.success("저장했어요.");
  }

  async function onDelete() {
    setBusy(true);
    try {
      const r = await deleteNotice({ noticeId: n.id, projectId, storageKey: n.storage_key });
      if (!r.ok) return toast.error(r.error.message ?? "삭제에 실패했어요.");
      toast.success("삭제했어요.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        {/* Thumbnail / icon — click to preview when supported */}
        <div className="shrink-0">
          {canPreview ? (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              title="미리보기"
              className="group relative block size-14 overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {n.kind === "image" && n.fileUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.fileUrl} alt={n.title} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center bg-muted/40 text-muted-foreground">
                  {typeIcon}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                <EyeIcon className="size-5 text-white" />
              </span>
            </button>
          ) : (
            <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
              {typeIcon}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공고명" className="h-8" />
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="메모·요약" className="min-h-[60px]" />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                마감일
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={busy}>저장</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium">{n.title}</p>
                {n.pinned && <PinIcon className="size-3.5 shrink-0 fill-current text-amber-500" />}
              </div>
              {n.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                {dlabel && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-medium",
                      urgent ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {dlabel}
                    {n.deadline ? ` · ${n.deadline}` : ""}
                  </span>
                )}
                <span className={cn("rounded border px-1.5 py-0.5", STATUS_TONE[n.status] ?? STATUS_TONE.open)}>
                  {statusLabel(n.status)}
                </span>
                {typeLabel && (
                  <span className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">{typeLabel}</span>
                )}
                {/* Preview / open / download */}
                {canPreview && (
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <EyeIcon className="size-3.5" /> 미리보기
                  </button>
                )}
                {n.kind === "link" && n.url && (
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <ExternalLinkIcon className="size-3.5" /> 열기
                  </a>
                )}
                {(n.kind === "file" || n.kind === "image") && n.fileUrl && (
                  <a href={n.fileUrl} target="_blank" rel="noopener noreferrer" download={n.file_name ?? undefined} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <DownloadIcon className="size-3.5" /> {n.file_name ?? "다운로드"}
                  </a>
                )}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        {!editing && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <select
              value={n.status}
              disabled={busy}
              onChange={(e) => patch({ noticeId: n.id, projectId, status: e.target.value as NoticeStatus })}
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {NOTICE_STATUS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="size-7" title="고정" disabled={busy}
                onClick={() => patch({ noticeId: n.id, projectId, pinned: !n.pinned })}>
                <PinIcon className={cn("size-3.5", n.pinned && "fill-current text-amber-500")} />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" title="수정" onClick={() => setEditing(true)}>
                <PencilIcon className="size-3.5" />
              </Button>
              {confirmDel ? (
                <>
                  <Button variant="ghost" size="icon" className="size-7 text-destructive" title="삭제 확인" disabled={busy} onClick={onDelete}>
                    {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" title="취소" onClick={() => setConfirmDel(false)}>
                    <XIcon className="size-3.5" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" title="삭제" onClick={() => setConfirmDel(true)}>
                  <Trash2Icon className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <NoticeViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        target={{
          title: n.title,
          kind: n.kind,
          fileName: n.file_name,
          mimeType: n.mime_type,
          fileUrl: n.fileUrl,
          storageKey: n.storage_key,
        }}
      />
    </li>
  );
}

function StatusChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("text-[10px]", active ? "text-primary" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}
