import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { getAuthContext } from "@/server/auth";
import { getWorkspace, getTeam } from "@/lib/queries";
import { TeamManager } from "@/components/app/team-manager";
import { WorkspaceDanger } from "@/components/app/workspace-danger";

export const metadata = { title: "팀" };

export default async function TeamPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const [ctx, ws, team] = await Promise.all([
    getAuthContext(),
    getWorkspace(workspace),
    getTeam(workspace),
  ]);
  if (!ws) notFound();
  const isOwner = team.members.some(
    (m) => m.userId === ctx?.user.id && m.role === "owner",
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/home"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" /> 홈
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{ws.name} · 팀</h1>
      <TeamManager workspaceId={workspace} members={team.members} invites={team.invites} />

      {isOwner && (
        <div className="mt-12">
          <WorkspaceDanger workspaceId={workspace} workspaceName={ws.name} />
        </div>
      )}
    </div>
  );
}
