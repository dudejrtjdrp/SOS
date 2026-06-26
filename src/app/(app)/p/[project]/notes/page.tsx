import { getNotes } from "@/lib/queries";
import { NotesView } from "@/components/app/notes-view";

export const metadata = { title: "노트" };

export default async function NotesPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const notes = await getNotes(project);
  return <NotesView projectId={project} notes={notes} />;
}
