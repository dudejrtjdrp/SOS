"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  DownloadIcon,
  Loader2Icon,
  AlertCircleIcon,
  PencilIcon,
  EyeIcon,
  BoldIcon,
  ItalicIcon,
  Heading2Icon,
  ListIcon,
  SaveIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  previewKind,
  previewLabel,
  officeEmbedUrl,
  type PreviewKind,
} from "@/core/notices/meta";
import { replaceNoticeFile } from "@/server/actions/notice";
import { cn } from "@/lib/utils";

export interface NoticeViewerTarget {
  title: string;
  kind: string;
  fileName: string | null;
  mimeType: string | null;
  /** Presigned R2 URL — used for image / pdf / office viewers and download. */
  fileUrl: string | null;
  /** Storage key — used by the same-origin proxy for the 한글(.hwp/.hwpx) viewer. */
  storageKey: string | null;
  /** Notice row id + project — needed to save an edited .hwpx back to the 공고문. */
  noticeId?: string | null;
  projectId?: string | null;
}

const BADGE_TONE: Record<string, string> = {
  이미지: "bg-[var(--success)]/10 text-foreground border-[var(--success)]/30",
  PDF: "bg-destructive/10 text-destructive border-destructive/30",
  독스: "bg-primary/10 text-foreground border-primary/30",
  한글: "bg-sky-500/10 text-foreground border-sky-500/30",
};

export function NoticeViewer({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: NoticeViewerTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after an edited .hwpx is saved back to the 공고문 (refresh the list). */
  onSaved?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[92vh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0"
      >
        {target && <ViewerInner target={target} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function ViewerInner({ target, onSaved }: { target: NoticeViewerTarget; onSaved?: () => void }) {
  const pk = previewKind(target);
  const label = previewLabel(pk);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5 pr-12">
        {label && (
          <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium", BADGE_TONE[label] ?? "border-border text-muted-foreground")}>
            {label}
          </span>
        )}
        <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium">
          {target.title}
        </DialogTitle>
        {target.fileUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- plain download link
          <a
            href={target.fileUrl}
            download={target.fileName ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <DownloadIcon className="size-3.5" />
            원본
          </a>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <ViewerBody pk={pk} target={target} onSaved={onSaved} />
      </div>
    </>
  );
}

function ViewerBody({ pk, target, onSaved }: { pk: PreviewKind; target: NoticeViewerTarget; onSaved?: () => void }) {
  const { fileUrl, storageKey, title, fileName } = target;

  // Types that render from the presigned URL need it present.
  if ((pk === "image" || pk === "pdf" || pk === "office") && !fileUrl) {
    return <Fallback fileName={fileName} message="파일을 불러올 수 없어요. 잠시 후 다시 시도해 주세요." />;
  }

  if (pk === "image" && fileUrl) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl} alt={title} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (pk === "pdf" && fileUrl) {
    return <iframe src={fileUrl} title={title} className="min-h-0 flex-1 border-0" />;
  }

  if (pk === "office" && fileUrl) {
    return (
      <iframe
        src={officeEmbedUrl(fileUrl)}
        title={title}
        className="min-h-0 flex-1 border-0 bg-muted/30"
      />
    );
  }

  // 한글: .hwp (binary 5.x) and .hwpx (OWPML) share one viewer/editor.
  if ((pk === "hwp" || pk === "hwpx") && storageKey) {
    return <HwpDocViewer pk={pk} target={target} onSaved={onSaved} />;
  }

  return (
    <Fallback
      fileName={fileName}
      fileUrl={fileUrl}
      message="이 형식은 미리보기를 지원하지 않아요. 다운로드해서 확인해 주세요."
    />
  );
}

const HWPX_CSS = `
.hwpx-doc { color: #171717; font-size: 13px; line-height: 1.7; word-break: break-word; }
.hwpx-doc p { margin: 0 0 0.5em; }
.hwpx-doc h1, .hwpx-doc h2, .hwpx-doc h3 { margin: 0.6em 0 0.4em; font-weight: 600; line-height: 1.35; }
.hwpx-doc h2 { font-size: 1.25em; }
.hwpx-doc ul, .hwpx-doc ol { margin: 0 0 0.6em; padding-left: 1.4em; }
.hwpx-doc table.hwpx-table, .hwpx-doc table.hwpx-tbl { border-collapse: collapse; margin: 0.6em 0; width: 100%; }
.hwpx-doc table.hwpx-table td, .hwpx-doc table.hwpx-table th, .hwpx-doc .hwpx-tbl td { border: 1px solid #d4d4d4; padding: 4px 8px; vertical-align: top; }
.hwpx-doc table.hwpx-table th { background: #f5f5f5; font-weight: 600; }
.hwpx-doc .hwpx-pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
.hwpx-doc img, .hwpx-doc .hwpx-img, .hwpx-doc .hwpx-prv { max-width: 100%; height: auto; margin: 0.4em 0; }
`;

const TBTN =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent";

type Phase = "loading" | "primary" | "legacy-hwp" | "legacy-hwpx" | "error";

/**
 * Unified in-app 한글 viewer + WYSIWYG editor.
 *
 * Primary engine: @ssabrojs/hwpxjs renders both .hwp (via hwp→hwpx conversion)
 * and .hwpx to an editable HTML fragment, and writes the edited HTML back to
 * .hwpx for download / re-upload. If the library can't handle a document
 * (encrypted, exotic, conversion failure) we fall back to the legacy viewers
 * (hwp.js for .hwp, the minimal parseHwpx for .hwpx) in read-only mode.
 */
function HwpDocViewer({
  pk,
  target,
  onSaved,
}: {
  pk: PreviewKind;
  target: NoticeViewerTarget;
  onSaved?: () => void;
}) {
  const { storageKey, fileUrl, fileName, title, noticeId, projectId } = target;
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [html, setHtml] = React.useState("");
  const [bytes, setBytes] = React.useState<Uint8Array | null>(null);
  const [message, setMessage] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState<null | "download" | "notice">(null);

  const baseName = React.useMemo(() => {
    const n = fileName ?? title ?? "document";
    const dot = n.lastIndexOf(".");
    const stem = dot > 0 ? n.slice(0, dot) : n;
    return stem.trim() || "document";
  }, [fileName, title]);

  // Load the file and render it (primary engine, with legacy fallback).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhase("loading");
      setEditing(false);
      if (!storageKey) {
        setMessage("파일을 불러올 수 없어요.");
        setPhase("error");
        return;
      }
      try {
        const res = await fetch(`/api/uploads?key=${encodeURIComponent(storageKey)}`);
        if (!res.ok) throw new Error("파일을 불러오지 못했어요.");
        const raw = new Uint8Array(await res.arrayBuffer());
        if (cancelled) return;
        setBytes(raw);

        // Primary: hwpxjs unified engine → editable HTML.
        try {
          const { renderHwpDocToHtml } = await import("@/lib/hwpx-render");
          const out = await renderHwpDocToHtml(raw);
          if (cancelled) return;
          setHtml(out.html);
          setPhase("primary");
          return;
        } catch (primaryErr) {
          console.warn("[notice 한글 viewer] hwpxjs engine failed — falling back:", primaryErr);
          if (pk === "hwp") {
            if (cancelled) return;
            setPhase("legacy-hwp"); // hwp.js renders from `bytes` in a child
            return;
          }
          const { parseHwpx } = await import("@/lib/hwpx");
          const out = parseHwpx(raw);
          if (cancelled) return;
          setHtml(out);
          setPhase("legacy-hwpx");
          return;
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[notice 한글 viewer]", e);
        setMessage(e instanceof Error && e.message ? e.message : "한글 문서를 여는 중 문제가 발생했어요.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, pk]);

  // Fill the editable container imperatively so React never clobbers user edits.
  React.useLayoutEffect(() => {
    if (phase === "primary" && editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  }, [phase, html]);

  function enterEdit() {
    setEditing(true);
    // Prefer <p> blocks on Enter so the result round-trips cleanly to .hwpx.
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      try {
        document.execCommand("defaultParagraphSeparator", false, "p");
      } catch {
        /* not all browsers support this — harmless */
      }
    });
  }

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, value);
    } catch {
      /* ignore unsupported command */
    }
  }

  async function buildHwpxBytes() {
    const el = editorRef.current;
    if (!el) return null;
    const { htmlToHwpxBytes } = await import("@/lib/hwpx-render");
    return htmlToHwpxBytes(el.innerHTML, baseName);
  }

  async function doDownload() {
    setSaving("download");
    try {
      const out = await buildHwpxBytes();
      if (!out) throw new Error("내용을 읽지 못했어요.");
      const blob = new Blob([out], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}.hwpx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(".hwpx 파일을 내려받았어요.");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : ".hwpx 변환에 실패했어요.");
    } finally {
      setSaving(null);
    }
  }

  async function doSaveToNotice() {
    if (!noticeId || !projectId) return;
    setSaving("notice");
    try {
      const out = await buildHwpxBytes();
      if (!out) throw new Error("내용을 읽지 못했어요.");
      const file = new File([out], `${baseName}.hwpx`, { type: "application/octet-stream" });
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("file", file);
      const up = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await up.json().catch(() => null);
      if (!up.ok || !j?.key) throw new Error(j?.error?.message ?? "업로드에 실패했어요.");
      const r = await replaceNoticeFile({
        noticeId,
        projectId,
        storageKey: j.key,
        fileName: j.fileName,
        mimeType: j.mimeType,
        sizeBytes: j.sizeBytes,
        oldStorageKey: storageKey,
      });
      if (!r.ok) throw new Error(r.error.message ?? "저장에 실패했어요.");
      toast.success("편집한 내용을 공고문에 저장했어요.");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "저장 중 오류가 발생했어요.");
    } finally {
      setSaving(null);
    }
  }

  if (phase === "error") {
    return <Fallback fileName={fileName} fileUrl={fileUrl} message={message} />;
  }

  const busy = saving !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <style>{HWPX_CSS}</style>

      {phase === "primary" && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-3 py-1.5">
          <button type="button" className={cn(TBTN, editing && "bg-secondary text-foreground")} onClick={() => (editing ? setEditing(false) : enterEdit())}>
            {editing ? <EyeIcon className="size-3.5" /> : <PencilIcon className="size-3.5" />}
            {editing ? "보기" : "편집"}
          </button>

          {editing && (
            <>
              <span className="mx-1 h-4 w-px bg-border" />
              <button type="button" className={TBTN} title="굵게" onClick={() => exec("bold")}>
                <BoldIcon className="size-3.5" />
              </button>
              <button type="button" className={TBTN} title="기울임" onClick={() => exec("italic")}>
                <ItalicIcon className="size-3.5" />
              </button>
              <button type="button" className={TBTN} title="제목" onClick={() => exec("formatBlock", "h2")}>
                <Heading2Icon className="size-3.5" />
              </button>
              <button type="button" className={TBTN} title="목록" onClick={() => exec("insertUnorderedList")}>
                <ListIcon className="size-3.5" />
              </button>
            </>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button type="button" className={TBTN} onClick={doDownload} disabled={busy}>
              {saving === "download" ? <Loader2Icon className="size-3.5 animate-spin" /> : <DownloadIcon className="size-3.5" />}
              .hwpx 다운로드
            </button>
            {noticeId && projectId && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                onClick={doSaveToNotice}
                disabled={busy}
              >
                {saving === "notice" ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
                공고문에 저장
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-auto bg-white">
        {phase === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            한글 문서를 불러오는 중…
          </div>
        )}

        {phase === "primary" && (
          <div className="mx-auto max-w-3xl px-8 py-6">
            <div
              ref={editorRef}
              className={cn("hwpx-doc outline-none", editing && "rounded-md p-3 ring-2 ring-primary/30")}
              contentEditable={editing}
              suppressContentEditableWarning
            />
          </div>
        )}

        {phase === "legacy-hwpx" && (
          <div
            className="hwpx-doc mx-auto max-w-3xl px-8 py-6"
            // Content is HTML-escaped in parseHwpx; only its own tags + data: URLs are emitted.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {phase === "legacy-hwp" && bytes && <LegacyHwpRender bytes={bytes} />}
      </div>

      {phase === "primary" && editing && (
        <p className="shrink-0 border-t border-border bg-muted/20 px-3 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          편집한 내용은 한글 신형(<b>.hwpx</b>) 형식으로 저장돼요 — 한글·한컴오피스에서 바로 열 수 있어요. 복잡한 서식·도형·머리말 등은 일부 단순화될 수 있어요.
        </p>
      )}

      {(phase === "legacy-hwp" || phase === "legacy-hwpx") && (
        <p className="shrink-0 border-t border-border bg-muted/20 px-3 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          기본 뷰어로 열지 못해 간단 보기로 표시했어요. 편집·저장은 지원되지 않아요 — 원본을 내려받아 확인해 주세요.
        </p>
      )}
    </div>
  );
}

/** Legacy read-only .hwp render via hwp.js (fallback when hwpxjs can't convert). */
function LegacyHwpRender({ bytes }: { bytes: Uint8Array }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    let viewer: { distory?: () => void } | null = null;
    (async () => {
      try {
        // hwp.js Viewer expects a binary string where charCodeAt(i) === bytes[i].
        const CHUNK = 0x8000;
        const parts: string[] = [];
        for (let i = 0; i < bytes.length; i += CHUNK) {
          parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
        }
        const bin = parts.join("");
        const mod = await import("hwp.js");
        if (cancelled) return;
        const el = ref.current;
        if (!el) return;
        el.innerHTML = "";
        // hwp.js reads with CFB type:'binary' at runtime, so it needs a binary
        // string even though its .d.ts types the param as Uint8Array.
        viewer = new mod.Viewer(el, bin as unknown as Uint8Array);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error && e.message ? e.message : "한글 파일을 여는 중 문제가 발생했어요.");
      }
    })();
    return () => {
      cancelled = true;
      try {
        viewer?.distory?.();
      } catch {
        /* ignore cleanup errors */
      }
    };
  }, [bytes]);

  if (err) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <AlertCircleIcon className="size-6" />
        {err}
      </div>
    );
  }
  return <div ref={ref} className="min-h-full [&_*]:select-text" />;
}

function Fallback({
  message,
  fileName,
  fileUrl,
}: {
  message: string;
  fileName: string | null;
  fileUrl?: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 p-8 text-center">
      <AlertCircleIcon className="size-8 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {fileUrl && (
        <a
          href={fileUrl}
          download={fileName ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <DownloadIcon className="size-4" />
          {fileName ?? "다운로드"}
        </a>
      )}
    </div>
  );
}
