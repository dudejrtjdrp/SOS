"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// useLayoutEffect on the client (resize before paint, no flicker), useEffect on
// the server (avoids the SSR "useLayoutEffect does nothing" warning).
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Auto-growing textarea. The box always renders a little taller than the text
 * it holds — it expands to fit its content (no inner scrollbar) and never sits
 * shorter than its min-height floor. The `min-h-[…]` utility passed via
 * `className` still acts as the lower bound; content beyond that grows the box.
 *
 * Controlled and uncontrolled usage both work: the height is recomputed on
 * every input event and whenever the `value` prop changes (e.g. programmatic
 * resets or KB autofill).
 */
export function Textarea({
  className,
  onInput,
  value,
  ...props
}: React.ComponentProps<"textarea">) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight already includes padding; +1px avoids a sub-pixel scrollbar.
    el.style.height = `${el.scrollHeight + 1}px`;
  }, []);

  // Recompute after render so controlled value changes (and the first paint)
  // size the box correctly.
  useIsoLayoutEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onInput={(e) => {
        resize();
        onInput?.(e);
      }}
      className={cn(
        "min-h-[80px] w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
