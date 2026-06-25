"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  HomeIcon,
  BookOpenIcon,
  LightbulbIcon,
  TelescopeIcon,
  CircleCheckIcon,
  ChartColumnIcon,
  FileTextIcon,
  WorkflowIcon,
  NetworkIcon,
  MessagesSquareIcon,
  LibraryIcon,
  SettingsIcon,
  LogOutIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { signOut } from "@/app/(app)/actions";

type NavItem = { label: string; icon: LucideIcon; href?: string; soon?: string };

const groups: { heading?: string; items: NavItem[] }[] = [
  { items: [{ label: "홈", icon: HomeIcon, href: "/home" }] },
  {
    heading: "프로젝트",
    items: [
      { label: "Knowledge Base", icon: BookOpenIcon, soon: "Phase 1" },
      { label: "Idea Lab", icon: LightbulbIcon, soon: "Phase 2" },
      { label: "Research", icon: TelescopeIcon, soon: "Phase 2" },
      { label: "Validation", icon: CircleCheckIcon, soon: "Phase 2" },
      { label: "Analysis", icon: ChartColumnIcon, soon: "Phase 1" },
      { label: "Documents", icon: FileTextIcon, soon: "Phase 3" },
      { label: "Workflows", icon: WorkflowIcon, soon: "Phase 5" },
      { label: "Project Memory", icon: NetworkIcon, soon: "Phase 4" },
      { label: "AI Chat", icon: MessagesSquareIcon, soon: "Phase 4" },
    ],
  },
  {
    heading: "워크스페이스",
    items: [
      { label: "Library", icon: LibraryIcon, soon: "Phase 5" },
      { label: "Settings", icon: SettingsIcon, soon: "Phase 0" },
    ],
  },
];

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          S
        </div>
        <span className="text-sm font-semibold tracking-tight">SOS</span>
        <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
          beta
        </span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        {groups.map((group, i) => (
          <div key={i}>
            {group.heading && (
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href && pathname === item.href;
                const className = cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                );
                const Icon = item.icon;
                if (item.href) {
                  return (
                    <li key={item.label}>
                      <Link href={item.href} className={className}>
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      className={className}
                      onClick={() =>
                        toast.info(`${item.label} — ${item.soon}에서 제공됩니다`)
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {item.soon}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-xs text-muted-foreground" title={userEmail}>
            {userEmail}
          </span>
          <ModeToggle />
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOutIcon className="size-4" />
            로그아웃
          </Button>
        </form>
      </div>
    </aside>
  );
}
