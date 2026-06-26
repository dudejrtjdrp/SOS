import Link from "next/link";
import { LogOutIcon, UsersIcon } from "lucide-react";
import { getAuthContext } from "@/server/auth";
import { getWorkspacesWithProjects } from "@/lib/queries";
import { signOut } from "@/app/(app)/actions";
import { CreateWorkspace, CreateProject } from "@/components/app/create";
import { ProjectCard, ArchivedProjectRow } from "@/components/app/project-card";
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
                  <ProjectCard
                    key={p.id as string}
                    project={{
                      id: p.id as string,
                      name: p.name as string,
                      description: (p.description as string | null) ?? null,
                    }}
                  />
                ))}
                <CreateProject workspaceId={ws.id} />
              </div>

              {ws.archivedProjects.length > 0 && (
                <details className="mt-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-2">
                  <summary className="cursor-pointer select-none text-xs text-muted-foreground">
                    보관됨 {ws.archivedProjects.length}
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {ws.archivedProjects.map((p) => (
                      <ArchivedProjectRow
                        key={p.id as string}
                        project={{
                          id: p.id as string,
                          name: p.name as string,
                          description: (p.description as string | null) ?? null,
                        }}
                      />
                    ))}
                  </div>
                </details>
              )}
            </section>
          ))
        )}
      </main>
    </div>
  );
}
