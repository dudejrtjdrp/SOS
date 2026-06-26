import { getNotices } from "@/lib/queries";
import { NoticesView } from "@/components/app/notices-view";

export const metadata = { title: "공고문" };

export default async function NoticesPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const notices = await getNotices(project);
  return <NoticesView projectId={project} notices={notices} />;
}
