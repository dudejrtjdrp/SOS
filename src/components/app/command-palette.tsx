"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { HomeIcon, SparklesIcon, FileTextIcon, SunMoonIcon } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="명령 검색 또는 모듈 실행…" />
      <CommandList>
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        <CommandGroup heading="이동">
          <CommandItem onSelect={() => run(() => router.push("/home"))}>
            <HomeIcon className="size-4" />홈
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="모듈">
          <CommandItem
            onSelect={() =>
              run(() => toast.info("SWOT 모듈은 Phase 1에서 연결됩니다"))
            }
          >
            <SparklesIcon className="size-4" />
            SWOT 분석 실행
            <CommandShortcut>Phase 1</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => toast.info("문서 생성은 Phase 3에서 연결됩니다"))
            }
          >
            <FileTextIcon className="size-4" />
            사업계획서 생성
            <CommandShortcut>Phase 3</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="설정">
          <CommandItem
            onSelect={() =>
              run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
          >
            <SunMoonIcon className="size-4" />
            테마 전환
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
