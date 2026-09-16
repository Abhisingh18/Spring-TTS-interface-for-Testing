"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up to `value` once the tile scrolls into view. */
export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || reduced || typeof IntersectionObserver === "undefined") return;

    setShown(0);

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || started.current) return;
      started.current = true;
      observer.disconnect();

      const duration = 900;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        // Ease-out cubic: fast first, settles on the exact number.
        const eased = 1 - Math.pow(1 - progress, 3);
        setShown(Math.round(value * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tnum">
      {shown}
      {suffix}
    </span>
  );
}
