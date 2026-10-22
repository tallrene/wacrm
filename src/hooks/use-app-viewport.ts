"use client";

import { useEffect } from "react";

/**
 * Keeps the app shell exactly as tall as the *visible* viewport.
 *
 * iOS (Safari and Home-Screen web apps alike) does not shrink the layout
 * viewport when the keyboard opens — it scrolls the whole page up so the
 * focused field is visible, which pushes our thread header off-screen.
 * `visualViewport` reports the real visible height, so we mirror it into
 * `--app-height` and pin the window at the top. The shell then shrinks
 * like a native chat app: header stays, thread area gets shorter.
 *
 * No-op where `visualViewport` is missing; desktop never resizes this way.
 */
export function useAppViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      raf = 0;
      root.style.setProperty("--app-height", `${Math.round(vv.height)}px`);
      // The page itself must not scroll; anything scrollable lives inside.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("orientationchange", schedule);
      root.style.removeProperty("--app-height");
    };
  }, []);
}
