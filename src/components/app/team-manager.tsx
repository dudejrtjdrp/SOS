"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyIcon, UserPlusIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { inviteMember, removeMember, updateMemberRole } from "@/server/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Member = { userId: string; role: string; name: string | null };
type Invite = { id: string; email: string; role: string; status: string; created_at: string };

export function TeamManager({
  workspaceId,
  members,
  invites,
}: {
  workspaceId: string;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [loading, setLoading] = React.useState(false);
  const [link, setLink] = React.useState<string | null>(null);
  // Which member row is mutating (remove or role change) — drives per-row spinner.
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function invite() {
    if (!email.trim()) return;
    setLoading(true);
    const r = await inviteMember({ workspaceId, email, role: role as "owner" | "member" });
    setLoading(false);
    if (!r.ok) return toast.error(r.error.message);
    const url = `${window.location.origin}/join?token=${r.data.token}`;
    setLink(url);
    setEmail("");
    toast.success("초대를 만들었습니다. 링크를 공유하세요.");
    router.refresh();
  }

  async function remove(userId: string) {
    setBusyId(userId);
    const r = await removeMember({ workspaceId, userId });
    setBusyId(null);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("멤버를 제거했습니다.");
    router.refresh();
  }

  async function changeRole(userId: string, newRole: string) {
    setBusyId(userId);
    const r = await updateMemberRole({ workspaceId, userId, role: newRole as "owner" | "member" });
    setBusyId(null);
    if (!r.ok) return toast.error(r.error.message);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-sm font-medium">멤버</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs">
                {(m.name ?? "M").charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-sm">{m.name ?? `멤버 ${m.userId.slice(0, 6)}`}</span>
              <Select
                value={m.role}
                onChange={(e) => changeRole(m.userId, e.target.value)}
                className="w-28"
                disabled={busyId === m.userId}
              >
                <option value="owner">owner</option>
                <option value="member">member</option>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove(m.userId)}
                aria-label="제거"
                disabled={busyId === m.userId}
              >
                {busyId === m.userId ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Trash2Icon className="size-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">초대</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-56"
            type="email"
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-28">
            <option value="member">member</option>
            <option value="owner">owner</option>
          </Select>
          <Button size="sm" onClick={invite} disabled={loading || !email.trim()}>
            <UserPlusIcon className="size-4" /> 초대
          </Button>
        </div>

        {link && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2 text-xs">
            <span className="flex-1 truncate font-mono">{link}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast.success("링크를 복사했습니다.");
              }}
            >
              <CopyIcon className="size-3.5" /> 복사
            </Button>
          </div>
        )}

        {invites.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                <span className="flex-1 truncate">{inv.email}</span>
                <Badge variant="outline">{inv.role}</Badge>
                <Badge variant="secondary">{inv.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
