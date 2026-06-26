"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { deleteWorkspace } from "@/server/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Owner-only "danger zone" that permanently deletes a workspace. */
export function WorkspaceDanger({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const canDelete = confirm.trim() === workspaceName.trim();

  async function remove() {
    if (!canDelete) return;
    setBusy(true);
    const r = await deleteWorkspace({ workspaceId });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("워크스페이스를 삭제했습니다.");
    router.push("/home");
  }

  return (
    <section className="rounded-lg border border-destructive/40 p-4">
      <h2 className="text-sm font-medium text-destructive">위험 구역</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        워크스페이스를 삭제하면 모든 프로젝트·지식베이스·문서·멤버가 영구히 사라집니다. 이 작업은 되돌릴 수 없습니다.
      </p>
      <Button
        variant="destructive"
        size="sm"
        className="mt-3"
        onClick={() => {
          setConfirm("");
          setOpen(true);
        }}
      >
        <Trash2Icon className="size-4" /> 워크스페이스 삭제
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>워크스페이스를 영구 삭제할까요?</DialogTitle>
            <DialogDescription>
              확인을 위해 워크스페이스 이름{" "}
              <span className="font-medium text-foreground">{workspaceName}</span>
              을(를) 입력하세요. 모든 데이터가 영구 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={workspaceName}
            onKeyDown={(e) => e.key === "Enter" && remove()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              취소
            </Button>
            <Button variant="destructive" onClick={remove} disabled={busy || !canDelete}>
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
