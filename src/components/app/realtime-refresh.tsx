"use client";

import { useRouter } from "next/navigation";
import { useRealtimeRefresh } from "@/lib/realtime";

/**
 * Drop-in: refreshes the current route when a teammate changes rows in `table`
 * for this project. Mount it in a server-component page (it renders nothing) to
 * make a read-only list live. For editor surfaces with local draft state, use
 * the dirty-aware pattern in the editor instead so refreshes don't clobber input.
 */
export function RealtimeRefresh({
  table,
  projectId,
  filter,
}: {
  table: string;
  projectId?: string;
  filter?: string;
}) {
  const router = useRouter();
  useRealtimeRefresh({ table, projectId, filter, onChange: () => router.refresh() });
  return null;
}
