"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { createModule } from "@/server/actions/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const CATEGORIES = [
  ["analysis", "Analysis"],
  ["idea", "Idea"],
  ["research", "Research"],
  ["validation", "Validation"],
  ["custom", "Custom"],
] as const;

export function CreateModule({ projectId, workspaceId }: { projectId: string; workspaceId: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>("custom");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    const r = await createModule({
      workspaceId,
      category: category as "idea" | "research" | "validation" | "analysis" | "document" | "custom",
      name,
    });
    setLoading(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("모듈을 만들었습니다.");
    router.push(`/p/${projectId}/library/${r.data.moduleId}`);
  }

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />새 모듈
      </Button>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="모듈 이름"
        className="w-48"
      />
      <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-32">
        {CATEGORIES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <Button size="sm" onClick={submit} disabled={loading || !name.trim()}>
        생성
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        취소
      </Button>
    </div>
  );
}
