import { redirect } from "next/navigation";
import { getProject, getKBFields } from "@/lib/queries";
import { getCurrentUser } from "@/server/auth";
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
  // Run all three concurrently — getProject no longer blocks the user/KB reads.
  // getKBFields takes the route param directly (same value as project.id), and
  // getCurrentUser is the request-cached auth read.
  const [project, user, kbFields] = await Promise.all([
    getProject(projectId),
    getCurrentUser(),
    getKBFields(projectId),
  ]);
  if (!project) redirect("/home");

  return (
    <div className="flex min-h-screen bg-background">
      <ProjectSidebar
        projectId={project.id}
        projectName={project.name}
        userEmail={user?.email ?? ""}
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
