import {
  UsersIcon,
  LightbulbIcon,
  TelescopeIcon,
  MessagesSquareIcon,
  GitBranchIcon,
  RefreshCwIcon,
  FileTextIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Users: UsersIcon,
  Lightbulb: LightbulbIcon,
  Telescope: TelescopeIcon,
  MessagesSquare: MessagesSquareIcon,
  GitBranch: GitBranchIcon,
  RefreshCw: RefreshCwIcon,
  FileText: FileTextIcon,
};

/** Resolve a 문서함 template's icon name to a lucide icon (StickyNote fallback). */
export function NoteIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? StickyNoteIcon;
  return <Icon className={className} />;
}
