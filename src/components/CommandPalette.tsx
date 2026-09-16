"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cx } from "@/lib/format";
import { useListenerStore } from "@/store/listener";
import { usePaletteStore } from "@/store/palette";

export interface PalettePair {
  slug: string;
  name: string;
  index: number;
}

interface Command {
  id: string;
  group: "Pairs" | "Go to" | "Actions";
  label: string;
  hint?: string;
  run: () => void;
}

/**
 * Ctrl/Cmd+K jump menu. Ten pairs plus five pages is more than a header can hold,
 * and the fastest way through a listening session is never to reach for the mouse.
 */
export function CommandPalette({ pairs }: { pairs: PalettePair[] }) {
  const router = useRouter();
  const signOut = useListenerStore((state) => state.signOut);
  const listener = useListenerStore((state) => state.listener);

  const open = usePaletteStore((state) => state.open);
  const setOpen = usePaletteStore((state) => state.setOpen);
  const togglePalette = usePaletteStore((state) => state.toggle);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, [setOpen]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      close();
    };

    return [
      ...pairs.map<Command>((pair) => ({
        id: `pair-${pair.slug}`,
        group: "Pairs",
        label: pair.name,
        hint: `Pair ${String(pair.index).padStart(2, "0")}`,
        run: go(`/pairs/${pair.slug}`),
      })),
      { id: "go-home", group: "Go to", label: "Landing page", run: go("/") },
      { id: "go-collections", group: "Go to", label: "Collections", run: go("/collections") },
      { id: "go-pairs", group: "Go to", label: "All pairs", run: go("/pairs") },
      { id: "go-models", group: "Go to", label: "Models", run: go("/models") },
      { id: "go-samples", group: "Go to", label: "Samples", run: go("/samples") },
      { id: "go-blind", group: "Go to", label: "Blind test", run: go("/blind-test") },
      { id: "go-results", group: "Go to", label: "My scores", run: go("/results") },
      { id: "go-admin", group: "Go to", label: "Everyone's ratings", run: go("/admin") },
      { id: "go-data", group: "Go to", label: "Bundle data", run: go("/data") },
      {
        id: "action-theme",
        group: "Actions",
        label: "Toggle light / dark theme",
        run: () => {
          const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
          document.documentElement.dataset.theme = next;
          try {
            localStorage.setItem("vc-listening-studio.theme", next);
          } catch {
            // Private mode: the switch still applies for this session.
          }
          close();
        },
      },
      ...(listener
        ? [
            {
              id: "action-signout",
              group: "Actions" as const,
              label: `Sign out of ${listener.name}`,
              run: () => {
                void signOut().then(() => router.push("/"));
                close();
              },
            },
          ]
        : []),
    ];
  }, [close, listener, pairs, router, signOut]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) ||
        command.hint?.toLowerCase().includes(needle),
    );
  }, [commands, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
        return;
      }
      if (event.key === "Escape" && open) close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, open, togglePalette]);

  useEffect(() => setCursor(0), [query]);

  // Keep the highlighted row inside the scroll box.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-start justify-center bg-bg-deep/70 p-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={close}
    >
      <div
        className="panel-raised w-full max-w-lg animate-[fade-up_0.18s_ease-out] overflow-hidden rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <SearchIcon />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((value) => (value + 1) % Math.max(matches.length, 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((value) => (value - 1 + matches.length) % Math.max(matches.length, 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                matches[cursor]?.run();
              }
            }}
            placeholder="Jump to a pair, a page, or an action…"
            aria-label="Search commands"
            className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          />
          <kbd className="rounded-md border border-line-strong bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-faint">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="thin-scroll max-h-[46vh] overflow-y-auto p-1.5">
          {matches.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">Nothing matches that.</p>
          ) : (
            matches.map((command, index) => {
              const newGroup = command.group !== lastGroup;
              lastGroup = command.group;
              return (
                <div key={command.id}>
                  {newGroup ? (
                    <div className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                      {command.group}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setCursor(index)}
                    onClick={command.run}
                    className={cx(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      index === cursor ? "bg-accent-soft text-accent" : "text-ink hover:bg-sunken",
                    )}
                  >
                    <span className="flex-1 truncate">{command.label}</span>
                    {command.hint ? (
                      <span className="tnum shrink-0 font-mono text-[10px] text-faint">
                        {command.hint}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-sunken/60 px-4 py-2 text-[11px] text-faint">
          <span>
            <Key>↑</Key> <Key>↓</Key> navigate
          </span>
          <span>
            <Key>↵</Key> open
          </span>
          <span className="ml-auto">
            <Key>ctrl</Key> <Key>K</Key>
          </span>
        </div>
      </div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-panel-solid px-1 font-mono text-[10px]">
      {children}
    </kbd>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="shrink-0 text-faint"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}
