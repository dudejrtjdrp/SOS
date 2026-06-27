"use client";

import * as React from "react";
import { DownloadIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface NoticeViewerTarget {
  title: string;
  kind: string;
  fileName: string | null;
  mimeType: string | null;
  /** Presigned R2 URL — used for image / pdf / office viewers and download. */
  fileUrl: string | null;
  /** Storage key — used by the same-origin proxy for the 한글(.hwp) viewer. */
  storageKey: string | null;
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
}: {
  target: NoticeViewerTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[92vh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0"
      >
        {target && <ViewerInner target={target} />}
      </DialogContent>
    </Dialog>
  );
}

function ViewerInner({ target }: { target: NoticeViewerTarget }) {
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
            다운로드
          </a>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <ViewerBody pk={pk} target={target} />
      </div>
    </>
  );
}

function ViewerBody({ pk, target }: { pk: PreviewKind; target: NoticeViewerTarget }) {
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

  if (pk === "hwp" && storageKey) {
    return <HwpViewer storageKey={storageKey} fileUrl={fileUrl} fileName={fileName} />;
  }

  if (pk === "hwpx") {
    return (
      <Fallback
        fileName={fileName}
        fileUrl={fileUrl}
        message="신형 한글 문서(.hwpx)는 브라우저 미리보기를 지원하지 않아요. 다운로드해서 확인해 주세요."
      />
    );
  }

  return (
    <Fallback
      fileName={fileName}
      fileUrl={fileUrl}
      message="이 형식은 미리보기를 지원하지 않아요. 다운로드해서 확인해 주세요."
    />
  );
}

/** In-app 한글(.hwp 5.x) renderer. hwp.js is loaded lazily on the client only. */
function HwpViewer({
  storageKey,
  fileUrl,
  fileName,
}: {
  storageKey: string;
  fileUrl: string | null;
  fileName: string | null;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    let viewer: { distory?: () => void } | null = null;

    (async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/uploads?key=${encodeURIComponent(storageKey)}`);
        if (!res.ok) throw new Error("파일을 불러오지 못했어요.");
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (cancelled) return;

        const mod = await import("hwp.js");
        if (cancelled) return;
        const el = containerRef.current;
        if (!el) return;
        el.innerHTML = "";
        // hwp.js renders pages into the container synchronously.
        viewer = new mod.Viewer(el, bytes);
        if (cancelled) return;
        setState("ready");
      } catch (e) {
        if (cancelled) return;
        console.error("[notice 한글 viewer]", e);
        setMessage(
          e instanceof Error && e.message
            ? e.message
            : "한글 파일을 여는 중 문제가 발생했어요.",
        );
        setState("error");
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
  }, [storageKey]);

  if (state === "error") {
    return <Fallback fileName={fileName} fileUrl={fileUrl} message={message} />;
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-auto bg-white">
      <div ref={containerRef} className="min-h-full [&_*]:select-text" />
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          한글 문서를 불러오는 중…
        </div>
      )}
    </div>
  );
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
