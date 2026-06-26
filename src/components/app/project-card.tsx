"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreVerticalIcon,
  ArchiveIcon,
  Trash2Icon,
  RotateCcwIcon,
} from "lucide-react";
import {
  archiveProject,
  deleteProject,
  unarchiveProject,
} from "@/server/actions/project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ProjectCardData = {
  id: string;
  name: string;
  description: string | null;
};

/** Shared confirm-and-delete dialog for permanent project deletion. */
function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleted,
}: {
  project: ProjectCardData;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  async function remove() {
    setBusy(true);
    const r = await deleteProject({ projectId: project.id });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    onOpenChange(false);
    toast.success("프로젝트를 삭제했습니다.");
    onDeleted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트를 영구 삭제할까요?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{project.name}</span>
            {" 프로젝트와 지식베이스·문서·결과물이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            취소
          </Button>
          <Button variant="destructive" onClick={remove} disabled={busy}>
            영구 삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Active project card with a kebab menu (보관 / 영구 삭제). */
export function ProjectCard({ project }: { project: ProjectCardData }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function archive() {
    setMenuOpen(false);
    setBusy(true);
    const r = await archiveProject({ projectId: project.id });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("프로젝트를 보관했습니다.");
    router.refresh();
  }

  return (
    <div className="group relative rounded-xl border border-border bg-card transition-colors hover:border-primary">
      <Link href={`/p/${project.id}`} className="block p-4 pr-10">
        <div className="font-medium">{project.name}</div>
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {project.description || "설명 없음"}
        </div>
      </Link>

      <div className="absolute right-2 top-2">
        <button
          type="button"
          aria-label="프로젝트 메뉴"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-secondary focus:opacity-100 group-hover:opacity-100"
        >
          <MoreVerticalIcon className="size-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-md">
              <button
                onClick={archive}
                disabled={busy}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary disabled:opacity-50"
              >
                <ArchiveIcon className="size-3.5" /> 보관
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2Icon className="size-3.5" /> 영구 삭제
              </button>
            </div>
          </>
        )}
      </div>

      <DeleteProjectDialog
        project={project}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}

/** Compact archived-project row with restore + permanent delete. */
export function ArchivedProjectRow({ project }: { project: ProjectCardData }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function restore() {
    setBusy(true);
    const r = await unarchiveProject({ projectId: project.id });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("프로젝트를 복구했습니다.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="flex-1 truncate text-sm text-muted-foreground">
        {project.name}
      </span>
      <Button size="sm" variant="ghost" onClick={restore} disabled={busy}>
        <RotateCcwIcon className="size-3.5" /> 복구
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirmDelete(true)}
        disabled={busy}
      >
        <Trash2Icon className="size-3.5" /> 삭제
      </Button>

      <DeleteProjectDialog
        project={project}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
