"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  DownloadIcon,
  FileTextIcon,
  PresentationIcon,
  SparklesIcon,
  Loader2Icon,
  CopyIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AI_ENABLED } from "@/lib/flags";
import { buildReviewPrompt } from "@/server/actions/document";

type Review = {
  persona: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

const LABEL: Record<string, string> = {
  investor: "투자자",
  judge: "심사위원",
  customer: "고객",
  competitor: "경쟁사",
};

export function DocumentActions({
  documentId,
  title,
  markdown,
}: {
  documentId: string;
  title: string;
  markdown: string;
}) {
  const [reviews, setReviews] = React.useState<Review[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<null | "docx" | "pptx">(null);

  function exportMd() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Fetch a server-rendered binary (docx/pptx) and trigger a browser download. */
  async function exportBinary(format: "docx" | "pptx") {
    setBusy(format);
    try {
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId, format }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        toast.error(j?.error?.message ?? "파일 생성에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function review() {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: "document", targetId: documentId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "리뷰에 실패했습니다.");
        return;
      }
      setReviews(json.reviews as Review[]);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // AI-off path: copy a multi-persona review prompt to run in an external AI.
  async function copyReviewPrompt() {
    setLoading(true);
    try {
      const r = await buildReviewPrompt({ documentId });
      if (!r.ok) {
        toast.error(r.error.message ?? "프롬프트를 만들지 못했어요.");
        return;
      }
      await navigator.clipboard.writeText(r.data.prompt);
      toast.success("리뷰 프롬프트를 복사했어요. ChatGPT·Claude에 붙여넣어 평가를 받아보세요.");
    } catch {
      toast.error("복사에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportBinary("docx")}
          disabled={busy !== null}
        >
          {busy === "docx" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <FileTextIcon className="size-4" />
          )}
          Word (.docx)
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportBinary("pptx")}
          disabled={busy !== null}
        >
          {busy === "pptx" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <PresentationIcon className="size-4" />
          )}
          PPT (.pptx)
        </Button>
        <Button size="sm" variant="outline" onClick={exportMd}>
          <DownloadIcon className="size-4" />
          내보내기 (.md)
        </Button>
        {AI_ENABLED ? (
          <Button size="sm" onClick={review} disabled={loading}>
            {loading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                평가 중…
              </>
            ) : (
              <>
                <SparklesIcon className="size-4" />
                AI 리뷰 (4관점)
              </>
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={copyReviewPrompt}
            disabled={loading}
            title="4관점 리뷰 프롬프트를 복사해 ChatGPT·Claude에서 평가받으세요"
          >
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CopyIcon className="size-4" />
            )}
            리뷰 프롬프트 복사
          </Button>
        )}
      </div>

      {reviews && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.persona} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Badge>{LABEL[r.persona] ?? r.persona}</Badge>
                <span className="ml-auto text-lg font-semibold">{r.score}/10</span>
              </div>
              <Section title="강점" items={r.strengths} />
              <Section title="약점" items={r.weaknesses} />
              <Section title="개선 제안" items={r.suggestions} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
