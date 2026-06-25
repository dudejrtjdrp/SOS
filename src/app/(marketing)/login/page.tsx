"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") ?? "/home";

    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // 회원가입인데 세션이 없으면 = Supabase에서 이메일 확인이 아직 켜져 있는 상태.
    if (mode === "signup" && !data.session) {
      setLoading(false);
      toast.message(
        "확인 이메일을 보냈습니다. (Supabase에서 'Confirm email'을 끄면 이 단계가 사라집니다.)",
      );
      return;
    }

    toast.success(mode === "signin" ? "로그인되었습니다." : "가입되었습니다.");
    // 전체 새로고침으로 미들웨어가 새 세션 쿠키를 인식하게 함.
    window.location.href = next;
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
          <h1 className="text-lg font-semibold">
            {mode === "signin" ? "로그인" : "회원가입"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "이메일과 비밀번호로 로그인하세요."
              : "이메일과 비밀번호로 계정을 만드세요."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@startup.com"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "처리 중…"
                : mode === "signin"
                  ? "로그인"
                  : "회원가입"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "계정이 없으신가요? 회원가입"
              : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          계속 진행하면 서비스 약관에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </main>
  );
}
