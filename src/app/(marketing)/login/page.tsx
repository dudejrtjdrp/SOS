"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") ?? "/home";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("로그인 링크를 이메일로 보냈습니다.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            S
          </span>
          SOS
        </Link>

        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">로그인 / 회원가입</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            이메일로 매직 링크를 보내드립니다. 비밀번호가 필요 없어요.
          </p>

          {sent ? (
            <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-4 text-sm">
              <strong>{email}</strong> 로 링크를 보냈습니다. 메일함을
              확인하세요.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@startup.com"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "전송 중…" : "매직 링크 받기"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          계속 진행하면 서비스 약관에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </main>
  );
}
