"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, SparklesIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleIcon } from "./module-icon";
import { getDocGuide, KB_FIELD_LABEL } from "@/core/modules/guide";
import { buildDocumentExternalPrompt } from "@/server/actions/document";
import { AI_ENABLED } from "@/lib/flags";

type DocType = { key: string; name: string; description: string | null };

export function DocumentPicker({
  projectId,
  docTypes,
  filledKeys,
}: {
  projectId: string;
  docTypes: DocType[];
  /** KB field keys that currently have a value (for needs chips). */
  filledKeys: string[];
}) {
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const router = useRouter();
  const filled = React.useMemo(() => new Set(filledKeys), [filledKeys]);

  async function generate(docType: string) {
    setLoadingKey(docType);
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
      setLoadingKey(null);
    }
  }

  // AI-off path: copy the full document prompt to run in an external AI, then
  // paste the result into 직접 조립 (manual composer) or save it as .md.
  async function copyPrompt(docType: string) {
    setLoadingKey(docType);
    try {
      const r = await buildDocumentExternalPrompt({ projectId, docType, language: "ko" });
      if (!r.ok) {
        toast.error(r.error.message ?? "프롬프트를 만들지 못했어요.");
        return;
      }
      await navigator.clipboard.writeText(r.data.prompt);
      toast.success("문서 프롬프트를 복사했어요. ChatGPT·Claude에 붙여넣어 작성한 뒤 ‘직접 조립’에 넣으세요.");
    } catch {
      toast.error("복사에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {docTypes.map((t) => {
        const g = getDocGuide(t.key);
        const busy = loadingKey === t.key;
        return (
          <div
            key={t.key}
            className="flex flex-col rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ModuleIcon name={g.icon} className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{t.name}</span>
                  {g.audience && (
                    <Badge variant="outline" className="shrink-0 font-normal">
                      {g.audience}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {g.tagline || (t.description ?? "")}
                </p>
              </div>
            </div>

            {g.whenToUse && (
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                <span className="text-foreground/70">이럴 때 — </span>
                {g.whenToUse}
              </p>
            )}

            {g.sections.length > 0 && (
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                <span className="text-foreground/70">구성 · </span>
                {g.sections.join(" · ")}
              </p>
            )}

            {g.needs.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-muted-foreground">필요 KB</span>
                {g.needs.map((k) => {
                  const has = filled.has(k);
                  return (
                    <span
                      key={k}
                      title={
                        has
                          ? undefined
                          : "Knowledge Base에 비어 있어요 — 먼저 채우면 문서가 충실해져요"
                      }
                      className={
                        has
                          ? "rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          : "rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground/70"
                      }
                    >
                      {KB_FIELD_LABEL[k] ?? k}
                      {has ? "" : " ·비어있음"}
                    </span>
                  );
                })}
              </div>
            )}

            {AI_ENABLED ? (
              <Button
                onClick={() => generate(t.key)}
                disabled={!!loadingKey}
                className="mt-4 w-full"
                size="sm"
              >
                {busy ? (
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
            ) : (
              <Button
                onClick={() => copyPrompt(t.key)}
                disabled={!!loadingKey}
                variant="outline"
                className="mt-4 w-full"
                size="sm"
                title="이 문서의 프롬프트를 복사해 ChatGPT·Claude에서 작성하세요"
              >
                {busy ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    복사 중…
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-4" />
                    프롬프트 복사
                  </>
                )}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
