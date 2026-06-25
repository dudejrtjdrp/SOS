import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]"
      />
      <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
        AI Startup Operating System
      </span>
      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        창업을 진행하세요. <br className="hidden sm:block" />
        GPT를 쓰는 게 아니라.
      </h1>
      <p className="mt-5 max-w-xl text-balance text-muted-foreground">
        아이디어 검증부터 사업계획서까지 하나의 워크플로우로. AI가 전략
        컨설턴트·투자 심사역·PM·시장조사원이 되어 더 빠른 의사결정을 돕습니다.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button asChild size="lg">
          <Link href="/login">시작하기</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">로그인</Link>
        </Button>
      </div>
      <p className="mt-16 text-xs text-muted-foreground">
        Prompt First · AI Native · Modular · Fast · Minimal · Beautiful
      </p>
    </main>
  );
}
