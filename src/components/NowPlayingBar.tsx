"use client";

import { usePathname } from "next/navigation";

import { cx } from "@/lib/format";
import { controlsFor, usePlayerStore } from "@/store/player";

/** Fixed transport for whatever is currently sounding, on any page. */
export function NowPlayingBar() {
  const activeId = usePlayerStore((state) => state.activeId);
  const activeLabel = usePlayerStore((state) => state.activeLabel);
  const rate = usePlayerStore((state) => state.rate);
  const loop = usePlayerStore((state) => state.loop);
  const setLoop = usePlayerStore((state) => state.setLoop);
  const pathname = usePathname();

  if (!activeId || pathname === "/") return null;
  const controls = controlsFor(activeId);

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="panel pointer-events-auto flex items-center gap-2 rounded-full py-2 pl-3 pr-2 shadow-lg">
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden="true">
          <span className="flex h-3.5 items-end gap-0.5">
            {[0, 1, 2].map((bar) => (
              <span
                key={bar}
                className="w-0.5 animate-pulse rounded-full bg-accent"
                style={{ height: `${6 + bar * 4}px`, animationDelay: `${bar * 140}ms` }}
              />
            ))}
          </span>
        </span>
        <span className="max-w-[46vw] truncate text-sm font-medium text-ink">{activeLabel}</span>

        <div className="mx-1 h-5 w-px bg-line" />

        <TransportButton label="Back 2 seconds" onClick={() => controls?.seekBy(-2)}>
          −2s
        </TransportButton>
        <TransportButton label="Restart clip" onClick={() => controls?.restart()}>
          ↺
        </TransportButton>
        <TransportButton label="Forward 2 seconds" onClick={() => controls?.seekBy(2)}>
          +2s
        </TransportButton>
        <TransportButton
          label={loop ? "Turn looping off" : "Loop this clip"}
          onClick={() => setLoop(!loop)}
          active={loop}
        >
          loop
        </TransportButton>
        <span className="tnum px-1 text-xs text-faint">{rate}×</span>
        <button
          type="button"
          onClick={() => controls?.pause()}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-bg"
        >
          Pause
        </button>
      </div>
    </div>
  );
}

function TransportButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        "tnum rounded-full px-2 py-1 text-xs transition-colors",
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
