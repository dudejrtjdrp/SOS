"use client";

import * as React from "react";
import { ShieldCheckIcon, TriangleAlertIcon, XIcon, ClipboardPasteIcon } from "lucide-react";
import type { VerificationStatus } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const VERIFICATION_CHIP: Record<VerificationStatus, { label: string; cls: string }> = {
  ai_draft: { label: "AI 초안", cls: "bg-muted text-muted-foreground" },
  needs_review: {
    label: "검토 필요",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  human_verified: {
    label: "검증 완료",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  rejected: { label: "반려됨", cls: "bg-[var(--danger)]/10 text-[var(--danger)]" },
};

export function VerificationChip({
  status,
  manual,
}: {
  status: VerificationStatus;
  manual?: boolean;
}) {
  // External (pasted) results aren't this app's AI draft — show provenance until
  // the human confirms or rejects them.
  if (manual && (status === "ai_draft" || status === "needs_review")) {
    return (
      <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400">
        외부 결과
      </Badge>
    );
  }
  const s = VERIFICATION_CHIP[status];
  return <Badge className={s.cls}>{s.label}</Badge>;
}

/** Decision Gate: a human verifies the AI draft (pass / send back / reject) and
 *  records the Founder's Take before it feeds the KB or document generation. */
export const DecisionGate = React.memo(function DecisionGate({
  verification,
  take,
  onTakeChange,
  artifactId,
  resolveError,
  lastRunId,
  onDecide,
  onRecheck,
  onPaste,
}: {
  verification: VerificationStatus;
  take: string;
  onTakeChange: (value: string) => void;
  artifactId: string | null;
  resolveError: null | "failed" | "timeout";
  lastRunId: string | null;
  onDecide: (next: VerificationStatus) => void;
  onRecheck: () => void;
  onPaste: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <VerificationChip status={verification} />
        <span className="text-sm font-medium">
          {verification === "human_verified"
            ? "검증을 완료했어요"
            : "이 결과를 어떻게 할까요?"}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {verification === "human_verified"
          ? "이제 아래 ‘KB에 저장’으로 지식 베이스에 넣거나, ‘문서 생성’으로 다음 단계로 넘어갈 수 있어요."
          : "AI가 만든 초안이에요. 내용을 살펴본 뒤 — 맞으면 ‘검증 완료’(→ KB 저장·문서 생성이 열려요), 더 다듬을 거면 ‘수정 필요’, 쓰지 않을 거면 ‘반려’를 누르세요."}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="founder-take">
          내 판단 <span className="font-normal text-muted-foreground">· 선택</span>
        </Label>
        <Textarea
          id="founder-take"
          value={take}
          onChange={(e) => onTakeChange(e.target.value)}
          placeholder="이 결과를 어떻게 보는지 한 줄 남기면 KB에 함께 저장돼요. 비워도 됩니다."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onDecide("human_verified")} disabled={!artifactId}>
          <ShieldCheckIcon className="size-4" />
          검증 완료 · 다음 단계 열기
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDecide("needs_review")} disabled={!artifactId}>
          <TriangleAlertIcon className="size-4" />
          수정 필요
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDecide("rejected")} disabled={!artifactId}>
          <XIcon className="size-4" />
          반려
        </Button>
      </div>
      {!artifactId &&
        (resolveError ? (
          <div className="space-y-2">
            <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-500">
              {resolveError === "failed"
                ? "AI 실행이 도중에 막혔어요(사용량 한도·오류). 결과가 저장되지 않았어요 — 왼쪽에서 다시 실행하거나, 외부 AI 결과를 붙여넣으세요."
                : "결과 저장을 아직 확인하지 못했어요. ‘다시 확인’을 누르거나 페이지를 새로고침해 주세요."}
            </p>
            <div className="flex flex-wrap gap-2">
              {resolveError === "timeout" && lastRunId && (
                <Button size="sm" variant="outline" onClick={onRecheck}>
                  다시 확인
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onPaste}>
                <ClipboardPasteIcon className="size-4" />
                결과 붙여넣기
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            결과를 저장하는 중… 잠시 후 버튼이 활성화돼요.
          </p>
        ))}
    </div>
  );
});
