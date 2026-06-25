"use client";

import * as React from "react";
import { toast } from "sonner";
import { SendIcon, Loader2Icon, CopyIcon, MessagesSquareIcon } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { AI_ENABLED } from "@/lib/flags";
import { buildChatContext } from "@/server/actions/chat";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPanel({ projectId }: { projectId: string }) {
  // AI off: the in-app chat is multi-turn so there's no single prompt to copy —
  // hand the user a pasteable project-context block to chat externally instead.
  if (!AI_ENABLED) return <ChatContextCopy projectId={projectId} />;
  return <LiveChat projectId={projectId} />;
}

function LiveChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    let res: Response;
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, messages: next }),
      });
    } catch {
      toast.error("네트워크 오류");
      setBusy(false);
      return;
    }
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => null);
      toast.error(j?.error?.message ?? "응답 실패");
      setBusy(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: acc };
        return copy;
      });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold">AI Chat</h1>
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            이 프로젝트의 Knowledge Base를 기반으로 무엇이든 물어보세요.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
                : "max-w-[85%] rounded-xl border border-border bg-card px-4 py-2"
            }
          >
            {m.role === "assistant" ? (
              m.content ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              )
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="메시지를 입력하세요 (Enter 전송)"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={send} disabled={busy || !input.trim()} size="icon">
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ChatContextCopy({ projectId }: { projectId: string }) {
  const [context, setContext] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const r = await buildChatContext({ projectId });
      if (!r.ok) {
        toast.error(r.error.message ?? "컨텍스트를 불러오지 못했어요.");
        return null;
      }
      setContext(r.data.context);
      return r.data.context;
    } catch {
      toast.error("불러오는 중 오류가 발생했어요.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function copy() {
    const c = context || (await load());
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c);
      toast.success("컨텍스트를 복사했어요. ChatGPT·Claude·Gemini에 붙여넣고 대화하세요.");
    } catch {
      toast.error("복사에 실패했어요. 아래 내용을 직접 선택해 복사하세요.");
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col px-6 py-6">
      <div className="mb-1 flex items-center gap-2">
        <MessagesSquareIcon className="size-5" />
        <h1 className="text-lg font-semibold">AI Chat · 외부에서 이어가기</h1>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        앱 내 AI는 꺼져 있어요. 아래 ‘컨텍스트 복사’로 이 프로젝트 정보를 복사해
        ChatGPT·Claude·Gemini에 붙여넣고 거기서 대화하세요. Knowledge Base와 검증된 분석이
        함께 담겨요.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button onClick={copy} disabled={loading}>
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          컨텍스트 복사
        </Button>
        <Button variant="outline" onClick={() => load()} disabled={loading}>
          새로고침
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
        {context ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
            {context}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            {loading ? "컨텍스트를 불러오는 중…" : "표시할 컨텍스트가 없어요. Knowledge Base를 먼저 채우세요."}
          </p>
        )}
      </div>
    </div>
  );
}
