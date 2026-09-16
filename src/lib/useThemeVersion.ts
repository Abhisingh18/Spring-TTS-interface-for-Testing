"use client";

import { useEffect, useState } from "react";

/**
 * Bumps whenever the document theme flips, so canvas drawings that read CSS
 * custom properties can repaint with the new palette.
 */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((value) => value + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return version;
}
