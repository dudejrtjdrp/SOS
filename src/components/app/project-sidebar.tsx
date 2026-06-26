"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
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
  ChevronLeftIcon,
  LogOutIcon,
  Loader2Icon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { signOut } from "@/app/(app)/actions";

type Item = { label: string; icon: LucideIcon; seg: string };

const items: Item[] = [
  { label: "Knowledge Base", icon: BookOpenIcon, seg: "knowledge" },
  { label: "Idea Lab", icon: LightbulbIcon, seg: "idea" },
  { label: "Research", icon: TelescopeIcon, seg: "research" },
  { label: "Validation", icon: CircleCheckIcon, seg: "validation" },
  { label: "Analysis", icon: ChartColumnIcon, seg: "analysis" },
  { label: "Documents", icon: FileTextIcon, seg: "documents" },
  { label: "Workflows", icon: WorkflowIcon, seg: "workflows" },
  { label: "Project Memory", icon: NetworkIcon, seg: "memory" },
  { label: "AI Chat", icon: MessagesSquareIcon, seg: "chat" },
  { label: "Library", icon: LibraryIcon, seg: "library" },
];

/**
 * Shows a spinner on the clicked nav item while its route is loading. Reads the
 * pending state of the nearest parent <Link>, so feedback is immediate even
 * when the destination is a slow dynamic route.
 */
function NavSpinner() {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2Icon className="ml-auto size-3.5 shrink-0 animate-spin opacity-70" />
  ) : null;
}

export function ProjectSidebar({
  projectId,
  projectName,
  userEmail,
}: {
  projectId: string;
  projectName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const base = `/p/${projectId}`;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 px-3">
        <Link
          href="/home"
          className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          aria-label="홈으로"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <Link href={base} className="truncate text-sm font-semibold" title={projectName}>
          {projectName}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {items.map((item) => {
          const href = `${base}/${item.seg}`;
          const active = pathname.startsWith(href);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              <NavSpinner />
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="truncate text-xs text-muted-foreground" title={userEmail}>
            {userEmail}
          </span>
          <ModeToggle />
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <LogOutIcon className="size-4" />
            로그아웃
          </Button>
        </form>
      </div>
    </aside>
  );
}
