"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { KeyCap } from "@/components/ui";

const SHORTCUTS: Array<{ keys: string[]; description: string }> = [
  { keys: ["1", "…", "0"], description: "Play or pause model 1 – 10, in bundle order" },
  { keys: ["Q"], description: "Source reference (the words)" },
  { keys: ["W"], description: "Target reference (the voice)" },
  { keys: ["Space"], description: "Pause or resume the clip that is playing" },
  { keys: ["←", "→"], description: "Seek the playing clip by 2 seconds" },
  { keys: ["R"], description: "Restart the playing clip" },
  { keys: ["L"], description: "Loop the playing clip" },
  { keys: ["K"], description: "Keep playhead position when switching clips" },
  { keys: ["[", "]"], description: "Previous / next pair" },
  { keys: ["Ctrl", "K"], description: "Jump to any pair, page or action" },
  { keys: ["?"], description: "Open this list" },
];

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (!typing && event.key === "?") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (pathname === "/") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-4 right-4 z-30 hidden h-9 w-9 place-items-center rounded-full border border-line bg-panel text-sm text-muted backdrop-blur transition-colors hover:text-ink md:grid"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel w-full max-w-md rounded-2xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-muted hover:bg-sunken hover:text-ink"
              >
                Close
              </button>
            </div>
            <dl className="space-y-2">
              {SHORTCUTS.map((shortcut) => (
                <div key={shortcut.description} className="flex items-center gap-3">
                  <dt className="flex w-24 shrink-0 gap-1">
                    {shortcut.keys.map((key) => (
                      <KeyCap key={key}>{key}</KeyCap>
                    ))}
                  </dt>
                  <dd className="text-sm text-muted">{shortcut.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}
