"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { updateProfile } from "@/server/actions/profile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Clickable identity row (avatar + display name, with email fallback) for the
 * sidebar footer and home header. Clicking opens a dialog to edit the user's
 * own display name. `className` lets each placement control how it sizes —
 * sidebars pass `flex-1` to fill, the header stays compact.
 */
export function SidebarProfile({
  email,
  name,
  className,
}: {
  email: string;
  name: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(name ?? "");
  const [busy, setBusy] = React.useState(false);

  // Re-seed the field whenever the dialog opens or the saved name changes.
  React.useEffect(() => {
    if (open) setValue(name ?? "");
  }, [open, name]);

  const label = name?.trim() || email;
  const initial = label.charAt(0).toUpperCase() || "U";

  const trimmed = value.trim();
  const dirty = trimmed !== (name ?? "").trim();
  const canSave = dirty && trimmed.length > 0 && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    const r = await updateProfile({ displayName: trimmed });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    setOpen(false);
    toast.success("이름을 변경했습니다.");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="이름 변경"
        className={cn(
          "group flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent",
          className,
        )}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs">
          {initial}
        </div>
        <span className="truncate text-xs text-muted-foreground group-hover:text-foreground">
          {label}
        </span>
        <PencilIcon className="ml-auto size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>이름 설정</DialogTitle>
            <DialogDescription>
              팀원들에게 표시되는 이름입니다. 언제든 변경할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">이름</Label>
            <Input
              id="profile-name"
              autoFocus
              value={value}
              maxLength={40}
              onChange={(e) => setValue(e.target.value)}
              placeholder="표시할 이름"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
            <p className="truncate text-[11px] text-muted-foreground" title={email}>
              {email}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              취소
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {busy && <Loader2Icon className="size-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
