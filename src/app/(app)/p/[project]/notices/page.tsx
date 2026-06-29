import { getNotices, getProjectEvent, getModuleIdsByKeys } from "@/lib/queries";
import { moduleByKey } from "@/core/modules";
import { NoticesView } from "@/components/app/notices-view";

export const metadata = { title: "공고문" };

// Idea Lab tools offered in the 행사 정보 panel (most relevant first).
const IDEA_TOOL_KEYS = ["event_idea", "brainstorm"];

export default async function NoticesPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const [notices, event, ideaIds] = await Promise.all([
    getNotices(project),
    getProjectEvent(project),
    getModuleIdsByKeys(IDEA_TOOL_KEYS),
  ]);

  const ideaTools = IDEA_TOOL_KEYS.filter((k) => ideaIds[k]).map((k) => ({
    key: k,
    id: ideaIds[k],
    name: moduleByKey(k)?.name ?? k,
  }));

  return (
    <NoticesView projectId={project} notices={notices} event={event} ideaTools={ideaTools} />
  );
}
