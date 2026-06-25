import { redirect } from "next/navigation";
import { getProject, getKBFields } from "@/lib/queries";
import { getAuthContext } from "@/server/auth";
import { ProjectSidebar } from "@/components/app/project-sidebar";
import { KBQuickPanel } from "@/components/app/kb-quick-panel";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ project: string }>;
}) {
  const { project: projectId } = await params;
  const project = await getProject(projectId);
  if (!project) redirect("/home");

  const [ctx, kbFields] = await Promise.all([
    getAuthContext(),
    getKBFields(project.id),
  ]);

  return (
    <div className="flex min-h-screen bg-background">
      <ProjectSidebar
        projectId={project.id}
        projectName={project.name}
        userEmail={ctx?.user.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <KBQuickPanel
        projectId={project.id}
        projectName={project.name}
        fields={kbFields}
      />
    </div>
  );
}
