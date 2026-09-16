"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ListenerBadge } from "@/components/SignIn";
import { branding, splitWordmark } from "@/config/branding";
import { cx } from "@/lib/format";
import type { BundleStats } from "@/lib/types";
import { usePaletteStore } from "@/store/palette";
import { ratedCount, useRatingsStore } from "@/store/ratings";

export interface NavPair {
  slug: string;
  name: string;
  index: number;
  models: number;
}

const LINKS = [
  { href: "/pairs", label: "Pairs" },
  { href: "/blind-test", label: "Blind test" },
  { href: "/results", label: "My scores" },
  { href: "/admin", label: "Everyone" },
  { href: "/data", label: "Bundle data" },
];

const [wordmarkHead, wordmarkTail] = splitWordmark(branding.name);

export function SiteHeader({ pairs, stats }: { pairs: NavPair[]; stats: BundleStats }) {
  const pathname = usePathname();

  // The landing page carries its own marketing navigation.
  if (pathname === "/") return null;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <WaveMark />
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-ink">
              {wordmarkHead}{" "}
              <span className="font-normal text-muted">{wordmarkTail}</span>
            </span>
            <span className="tnum block text-[11px] text-faint">
              {stats.pairs} pairs · {stats.models} models · {stats.clips} clips · 16 kHz
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/pairs"
                ? pathname === "/pairs" || pathname.startsWith("/pairs/")
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <PaletteButton />
          <ListenerBadge />
          <ThemeToggle />
        </div>
      </div>

      <PairStrip pairs={pairs} pathname={pathname} />
    </header>
  );
}

function PaletteButton() {
  const setOpen = usePaletteStore((state) => state.setOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open the command palette"
      title="Jump to anything (Ctrl+K)"
      className="hidden items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-faint transition-colors hover:border-line-strong hover:text-ink sm:flex"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" strokeLinecap="round" />
      </svg>
      <span>Jump to…</span>
      <kbd className="rounded border border-line-strong bg-sunken px-1 font-mono text-[10px]">
        ctrl K
      </kbd>
    </button>
  );
}

function PairStrip({ pairs, pathname }: { pairs: NavPair[]; pathname: string }) {
  const ratings = useRatingsStore((state) => state.ratings);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <div className="border-t border-line/60">
      <div className="mx-auto flex w-full max-w-[1400px] gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 [scrollbar-width:thin]">
        {pairs.map((pair) => {
          const href = `/pairs/${pair.slug}`;
          const active = pathname === href;
          const done = hydrated ? ratedCount(ratings[pair.slug]) : 0;
          return (
            <Link
              key={pair.slug}
              href={href}
              className={cx(
                "group flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                active
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              <span className="tnum font-mono text-[10px] opacity-70">
                {String(pair.index).padStart(2, "0")}
              </span>
              <span className="font-medium">{pair.name}</span>
              {done > 0 ? (
                <span
                  className="tnum rounded-full bg-teal-soft px-1.5 text-[10px] font-semibold text-teal"
                  title={`${done} of ${pair.models} models rated`}
                >
                  {done}/{pair.models}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("vc-listening-studio.theme", next);
    } catch {
      // Private mode: the toggle still works for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function WaveMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/40 bg-accent-soft">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {[2, 5, 8, 11, 14].map((x, index) => {
          const heights = [6, 12, 16, 10, 5];
          const height = heights[index] ?? 8;
          return (
            <rect
              key={x}
              x={x - 0.75}
              y={9 - height / 2}
              width="1.5"
              height={height}
              rx="0.75"
              fill="var(--accent)"
            />
          );
        })}
      </svg>
    </span>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
    </svg>
  );
}
