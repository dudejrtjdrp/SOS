"use client";

import * as React from "react";
import { LightbulbIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getGuide } from "@/core/modules/guide";
import { AI_ENABLED } from "@/lib/flags";
import { ModuleIcon } from "../module-icon";

/** Idle-state explainer card: what the tool is for, what it produces, and how to run it. */
export const GuideCard = React.memo(function GuideCard({
  guide,
  moduleName,
}: {
  guide: ReturnType<typeof getGuide>;
  moduleName: string;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ModuleIcon name={guide.icon} className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            이 도구는
          </p>
          <p className="font-medium">{guide.tagline || moduleName}</p>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">이럴 때 쓰세요</dt>
          <dd className="mt-0.5 text-foreground">{guide.whenToUse}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">이런 결과를 얻어요</dt>
          <dd className="mt-0.5 text-foreground">{guide.youGet}</dd>
        </div>
        {guide.needs.length > 0 && (
          <div>
            <dt className="text-xs font-medium text-muted-foreground">필요 입력</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {guide.needs.map((n) => (
                <Badge key={n} variant="outline">
                  {n}
                </Badge>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {guide.tip && (
        <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <LightbulbIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>{guide.tip}</span>
        </p>
      )}

      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        {AI_ENABLED ? (
          <>
            왼쪽 값을 확인하고 <span className="font-medium text-foreground">실행</span>을 누르세요.
            Knowledge Base 값은 자동으로 채워집니다.
          </>
        ) : (
          <>
            왼쪽 값을 확인하고 <span className="font-medium text-foreground">프롬프트 복사</span>로
            ChatGPT·Claude에서 실행한 뒤, 결과를 <span className="font-medium text-foreground">붙여넣기</span>하세요.
            Knowledge Base 값은 자동으로 채워집니다.
          </>
        )}
      </p>
    </div>
  );
});
