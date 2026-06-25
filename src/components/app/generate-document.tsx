"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type DocType = { key: string; name: string; description: string | null };

export function GenerateDocument({
  projectId,
  docTypes,
}: {
  projectId: string;
  docTypes: DocType[];
}) {
  const [docType, setDocType] = React.useState(docTypes[0]?.key ?? "");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function generate() {
    if (!docType) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, docType, language: "ko" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "문서 생성에 실패했습니다.");
        return;
      }
      toast.success("문서를 생성했습니다.");
      router.push(`/p/${projectId}/documents/${json.documentId}`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <div className="mb-1.5 text-sm font-medium">원클릭 문서 생성</div>
        <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
          {docTypes.map((d) => (
            <option key={d.key} value={d.key}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <Button onClick={generate} disabled={loading || !docType}>
        {loading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            생성 중…
          </>
        ) : (
          <>
            <SparklesIcon className="size-4" />
            생성
          </>
        )}
      </Button>
    </div>
  );
}
