"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CopyIcon,
  CheckIcon,
  ClipboardPasteIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { KB_FIELDS, buildKBFormatPrompt, parseKBFormat } from "@/core/schemas/kb";

/** Copy text to the clipboard with a legacy fallback for insecure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

const LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  KB_FIELDS.map((f) => [f.key, f.label]),
);

/**
 * Knowledge Base format round-trip tools (top-right of the KB editor).
 *
 *  1. 형식 복사  — copies an instruction prompt + the empty labelled format so
 *     the user can paste it into ChatGPT/Claude alongside an existing
 *     사업계획서·PPT and have the AI reorganize that material into our shape.
 *  2. 붙여넣어 채우기 — paste the AI's filled result; recognized sections are
 *     previewed, then applied to the KB fields in one step.
 */
export function KBFormatTools({
  current,
  onApply,
}: {
  /** Current field values — used only to flag which fields a paste overwrites. */
  current: Record<string, string>;
  /** Persist + reflect the parsed fields in the editor. */
  onApply: (fields: Record<string, string>) => void | Promise<void>;
}) {
  const [copied, setCopied] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [applying, setApplying] = React.useState(false);

  const parsed = React.useMemo(() => parseKBFormat(text), [text]);
  const parsedKeys = Object.keys(parsed);

  async function copyFormat() {
    if (!(await copyText(buildKBFormatPrompt()))) {
      return toast.error("복사에 실패했습니다.");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("형식과 프롬프트를 복사했어요. ChatGPT·Claude에 자료와 함께 붙여넣으세요.");
  }

  async function apply() {
    if (!parsedKeys.length) return;
    setApplying(true);
    await onApply(parsed);
    setApplying(false);
    setOpen(false);
    setText("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={copyFormat}
        title="형식과 작성 프롬프트를 함께 복사 — ChatGPT·Claude에 자료와 함께 붙여넣으세요"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        형식 복사
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        title="AI가 형식대로 정리한 결과를 붙여넣어 자동으로 채우기"
      >
        <ClipboardPasteIcon className="size-3.5" />
        붙여넣어 채우기
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-2xl flex-col overflow-hidden sm:max-h-[calc(100vh-4rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-primary" />
              형식에 맞춰 채우기
            </DialogTitle>
            <DialogDescription>
              ChatGPT·Claude가 형식대로 정리해 준 결과를 붙여넣으세요. 항목을 자동으로
              인식해 Knowledge Base를 채웁니다.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <Textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "여기에 결과를 붙여넣으세요…\n\n## 프로젝트명\n리뷰메이트\n\n## 서비스 설명\n네이버·배달앱 리뷰를 한곳에 모아…"
              }
              className="min-h-[240px] max-h-[40vh] resize-none overflow-y-auto font-mono text-xs leading-relaxed"
            />

            {text.trim() && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                {parsedKeys.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    인식된 항목이 없습니다. 제목 줄(예{": "}
                    <code className="rounded bg-secondary px-1 py-0.5">## 프로젝트명</code>)이
                    형식과 같은지 확인하세요.
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      인식된 항목 {parsedKeys.length}개
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedKeys.map((k) => {
                        const overwrite = (current[k] ?? "").trim().length > 0;
                        return (
                          <span
                            key={k}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                              "border-border bg-background text-foreground/80",
                            )}
                          >
                            <CheckIcon className="size-3 text-success" />
                            {LABEL_BY_KEY[k] ?? k}
                            {overwrite && (
                              <span className="text-muted-foreground/70">· 덮어씀</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={apply} disabled={parsedKeys.length === 0 || applying}>
              {parsedKeys.length > 0 ? `${parsedKeys.length}개 항목 채우기` : "채우기"}
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
