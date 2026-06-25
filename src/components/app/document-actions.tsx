"use client";

import * as React from "react";
import { toast } from "sonner";
import { DownloadIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  function exportMd() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={exportMd}>
          <DownloadIcon className="size-4" />
          내보내기 (.md)
        </Button>
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
