import { ChatPanel } from "@/components/app/chat-panel";

export const metadata = { title: "AI Chat" };

export default async function ChatPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  return <ChatPanel projectId={project} />;
}
