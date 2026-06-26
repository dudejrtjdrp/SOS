"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to Supabase Realtime postgres_changes for one table, scoped to a
 * project (or any custom filter), and run `onChange` whenever a teammate
 * inserts/updates/deletes a row. Delivery is still gated by the table's RLS
 * policies, so a client only hears about rows it is allowed to read.
 *
 * The callback is held in a ref so changing it doesn't tear down the channel;
 * the subscription only re-establishes when the table or filter changes.
 *
 * Pair it with a "save" button rather than per-keystroke writes: the save
 * persists, and every other open client refreshes from this event.
 */
export function useRealtimeRefresh({
  table,
  projectId,
  filter,
  onChange,
  enabled = true,
}: {
  table: string;
  projectId?: string;
  /** Full PostgREST filter, e.g. "document_id=eq.<id>". Defaults to project scope. */
  filter?: string;
  onChange: () => void;
  enabled?: boolean;
}) {
  const cb = React.useRef(onChange);
  cb.current = onChange;

  const flt = filter ?? (projectId ? `project_id=eq.${projectId}` : undefined);

  React.useEffect(() => {
    if (!enabled || !flt) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`rt:${table}:${flt}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: flt },
        () => cb.current(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, flt, enabled]);
}
