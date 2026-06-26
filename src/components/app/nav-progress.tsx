"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Global top navigation progress bar.
 *
 * App Router navigations to dynamic (cookie-authed) routes need a server
 * round-trip, and shared layouts block the navigation *commit* — so for a beat
 * the old page just sits there with no feedback ("화면이 멈춘 것처럼 보임"). This
 * bar fires the instant an internal link is clicked (capture phase, before Next
 * even handles it) and completes when the new path commits, so there is always
 * visible motion. Dependency-free; no router events required.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);
  const active = useRef(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = useCallback(() => {
    if (trickle.current) {
      clearInterval(trickle.current);
      trickle.current = null;
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const start = useCallback(() => {
    if (active.current) return;
    active.current = true;
    clearAll();
    setFading(false);
    setWidth(8);
    // Ease toward 90% so a slow route keeps showing progress without ever
    // pretending to be done.
    trickle.current = setInterval(() => {
      setWidth((w) => (w >= 90 ? w : w + Math.max(0.4, (90 - w) * 0.06)));
    }, 160);
  }, [clearAll]);

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clearAll();
    setWidth(100);
    timers.current.push(setTimeout(() => setFading(true), 150));
    timers.current.push(
      setTimeout(() => {
        setWidth(0);
        setFading(false);
      }, 450),
    );
  }, [clearAll]);

  // Complete when the committed path changes. Guarded so back/forward and the
  // first render never flash the bar (finish() no-ops unless start() ran).
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Start on internal link clicks. Capture phase runs before Next's own click
  // handler, so feedback is immediate even while the layout/server is blocking.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const el = (e.target as HTMLElement | null)?.closest?.("a");
      if (!el) return;
      const a = el as HTMLAnchorElement;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page → no navigation, don't start a bar that would never finish.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  useEffect(() => () => clearAll(), [clearAll]);

  if (width === 0 && !fading) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5"
    >
      <div
        className="h-full rounded-r-full bg-primary transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${width}%`,
          opacity: fading ? 0 : 1,
          boxShadow: "0 0 10px var(--primary), 0 0 4px var(--primary)",
        }}
      />
    </div>
  );
}
