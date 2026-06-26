import { redirect } from "next/navigation";
import { getNote } from "@/lib/queries";
import { NoteEditor } from "@/components/app/note-editor";

export const metadata = { title: "문서" };

export default async function NotePage({
  params,
}: {
  params: Promise<{ project: string; note: string }>;
}) {
  const { project, note: noteId } = await params;
  const note = await getNote(noteId);
  if (!note) redirect(`/p/${project}/notes`);
  return <NoteEditor note={note} />;
}
