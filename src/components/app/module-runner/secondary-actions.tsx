"use client";

import * as React from "react";
import Link from "next/link";
import { ThumbsUpIcon, ThumbsDownIcon, PinIcon, BookmarkPlusIcon } from "lucide-react";
import type { VerificationStatus } from "@/types/db";
import { Button } from "@/components/ui/button";
import { pinArtifact, rateArtifact, saveArtifactToKnowledge } from "@/server/actions/artifact";

/** Post-result actions: rate, pin, save to KB (gated on verification), and the
 *  "다음 단계: 문서 생성" link. `onAct` centralizes the toast + artifact-id guard. */
export const SecondaryActions = React.memo(function SecondaryActions({
  projectId,
  artifactId,
  verification,
  onAct,
}: {
  projectId: string;
  artifactId: string | null;
  verification: VerificationStatus;
  onAct: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, okMsg: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => onAct(() => rateArtifact({ artifactId: artifactId!, feedback: 1 }), "피드백 감사합니다")} disabled={!artifactId}>
        <ThumbsUpIcon className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAct(() => rateArtifact({ artifactId: artifactId!, feedback: -1 }), "피드백 감사합니다")} disabled={!artifactId}>
        <ThumbsDownIcon className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAct(() => pinArtifact({ artifactId: artifactId!, pinned: true }), "고정했습니다")} disabled={!artifactId}>
        <PinIcon className="size-4" />
        고정
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onAct(() => saveArtifactToKnowledge({ artifactId: artifactId! }), "Knowledge Base에 저장했습니다")}
        disabled={!artifactId || verification !== "human_verified"}
        title={verification !== "human_verified" ? "먼저 검증을 완료하세요" : undefined}
      >
        <BookmarkPlusIcon className="size-4" />
        KB에 저장
      </Button>
      {verification === "human_verified" ? (
        <Link href={`/p/${projectId}/documents`} className="ml-auto text-sm text-primary hover:underline">
          다음 단계: 문서 생성 →
        </Link>
      ) : (
        <span className="ml-auto text-sm text-muted-foreground" title="먼저 검증을 완료하세요">
          다음 단계: 문서 생성 →
        </span>
      )}
    </div>
  );
});
