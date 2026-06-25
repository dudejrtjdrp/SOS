"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { createWorkspace } from "@/server/actions/workspace";
import { createProject } from "@/server/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateWorkspace() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    const r = await createWorkspace({ name });
    setLoading(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("워크스페이스를 만들었습니다.");
    setName("");
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        워크스페이스
      </Button>
    );

  return (
    <div className="flex gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="워크스페이스 이름"
        className="w-48"
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <Button size="sm" onClick={submit} disabled={loading || !name.trim()}>
        생성
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        취소
      </Button>
    </div>
  );
}

export function CreateProject({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    const r = await createProject({ workspaceId, name });
    setLoading(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("프로젝트를 만들었습니다.");
    router.push(`/p/${r.data.id}/knowledge`);
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-full min-h-[92px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <PlusIcon className="mr-1.5 size-4" />새 프로젝트
      </button>
    );

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="프로젝트 이름"
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={loading || !name.trim()}>
          생성
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          취소
        </Button>
      </div>
    </div>
  );
}
