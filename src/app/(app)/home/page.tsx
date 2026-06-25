import Link from "next/link";
import { LogOutIcon, UsersIcon } from "lucide-react";
import { getAuthContext } from "@/server/auth";
import { getWorkspacesWithProjects } from "@/lib/queries";
import { signOut } from "@/app/(app)/actions";
import { CreateWorkspace, CreateProject } from "@/components/app/create";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata = { title: "홈" };

export default async function HomePage() {
  const ctx = await getAuthContext();
  const workspaces = await getWorkspacesWithProjects();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center gap-2 border-b border-border px-6">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          S
        </div>
        <span className="font-semibold tracking-tight">SOS</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {ctx?.user.email}
          </span>
          <ModeToggle />
          <form action={signOut}>
            <Button variant="ghost" size="icon" aria-label="로그아웃">
              <LogOutIcon className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">워크스페이스</h1>
          <CreateWorkspace />
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              첫 워크스페이스를 만들어 창업을 시작하세요.
            </p>
          </div>
        ) : (
          workspaces.map((ws) => (
            <section key={ws.id} className="mb-10">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-medium">{ws.name}</h2>
                <Badge variant="outline">{ws.role}</Badge>
                <Link
                  href={`/w/${ws.id}/team`}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <UsersIcon className="size-3.5" />팀
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ws.projects.map((p) => (
                  <Link
                    key={p.id as string}
                    href={`/p/${p.id}`}
                    className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
                  >
                    <div className="font-medium">{p.name as string}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {(p.description as string) || "설명 없음"}
                    </div>
                  </Link>
                ))}
                <CreateProject workspaceId={ws.id} />
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
