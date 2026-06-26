"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, SlidersHorizontalIcon } from "lucide-react";
import { forkSystemModule } from "@/server/actions/module";
import { Button } from "@/components/ui/button";

/**
 * "프롬프트 수정" entry point shown on each tool (run screen + Library). System
 * tools can't be edited in place (RLS), so this forks the tool into an editable
 * "내 모듈" copy via {@link forkSystemModule}, then opens its PromptBuilder.
 * Already-owned modules route straight to their builder (no fork).
 */
export function EditPromptButton({
  projectId,
  moduleId,
  label = "프롬프트 수정",
  size = "sm",
  variant = "outline",
  className,
}: {
  projectId: string;
  moduleId: string;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function open(e: React.MouseEvent) {
    // Library cards wrap content in a <Link>; don't navigate the card too.
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const r = await forkSystemModule({ projectId, moduleId });
      if (!r.ok) {
        toast.error(r.error.message ?? "프롬프트 편집을 열지 못했어요.");
        return;
      }
      if (r.data.forked) {
        toast.success("기본 도구를 ‘내 모듈’로 복제했어요. 자유롭게 수정하세요.");
      }
      router.push(`/p/${projectId}/library/${r.data.moduleId}`);
    } catch {
      toast.error("프롬프트 편집을 열지 못했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={open}
      disabled={loading}
      className={className}
      title="이 도구의 프롬프트(시스템 프롬프트·지시문·변수)를 복제해 수정합니다"
    >
      {loading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SlidersHorizontalIcon className="size-4" />
      )}
      {label}
    </Button>
  );
}
