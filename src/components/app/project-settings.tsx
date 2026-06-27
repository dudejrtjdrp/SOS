"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, Loader2Icon } from "lucide-react";
import { updateProject } from "@/server/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EditableProject = {
  id: string;
  name: string;
  description: string | null;
};

/** Controlled dialog for editing a project's name + description. */
export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSaved,
}: {
  project: EditableProject;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description ?? "");
  const [busy, setBusy] = React.useState(false);

  // Re-seed fields whenever the dialog (re)opens or the project changes.
  React.useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description ?? "");
    }
  }, [open, project.name, project.description]);

  const dirty =
    name.trim() !== project.name ||
    description.trim() !== (project.description ?? "");
  const canSave = dirty && name.trim().length > 0 && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    const r = await updateProject({
      projectId: project.id,
      name: name.trim(),
      description,
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    onOpenChange(false);
    toast.success("프로젝트를 수정했습니다.");
    onSaved?.();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트 편집</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">이름</Label>
            <Input
              id="proj-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">설명</Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="한 줄로 프로젝트를 설명하세요 (선택)"
              className="min-h-[72px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            취소
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Self-contained "편집" button that opens the edit dialog. Used in the project
 * overview header so the project is editable from inside the project too.
 */
export function ProjectEditButton({ project }: { project: EditableProject }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <PencilIcon className="size-4" /> 편집
      </Button>
      <EditProjectDialog project={project} open={open} onOpenChange={setOpen} />
    </>
  );
}
