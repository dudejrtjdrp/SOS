"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { acceptInvite } from "@/server/actions/workspace";

export default function JoinPage() {
  const router = useRouter();
  const [message, setMessage] = React.useState("초대를 확인하는 중…");

  React.useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setMessage("유효하지 않은 초대 링크입니다.");
      return;
    }
    acceptInvite({ token }).then((r) => {
      if (r.ok) {
        toast.success("워크스페이스에 참여했습니다.");
        router.replace(`/w/${r.data.workspaceId}/team`);
      } else {
        setMessage(r.error.message);
      }
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        {message}
      </div>
    </main>
  );
}
