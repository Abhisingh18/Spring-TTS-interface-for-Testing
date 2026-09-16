"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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

type IconName =
  | "collections"
  | "pairs"
  | "models"
  | "samples"
  | "blind"
  | "scores"
  | "everyone"
  | "data"
  | "workspace";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Matches nested routes too, e.g. /models/seedvc. */
  prefix?: boolean;
}

const GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Workspace",
    items: [
      { href: "/collections", label: "Collections", icon: "collections", prefix: true },
      { href: "/pairs", label: "Pairs", icon: "pairs", prefix: true },
      { href: "/models", label: "Models", icon: "models", prefix: true },
      { href: "/samples", label: "Samples", icon: "samples" },
    ],
  },
  {
    title: "Evaluation",
    items: [
      { href: "/blind-test", label: "Blind test", icon: "blind" },
      { href: "/results", label: "My scores", icon: "scores" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { href: "/admin", label: "Everyone's ratings", icon: "everyone" },
      { href: "/data", label: "Bundle data", icon: "data" },
    ],
  },
  {
    title: "Management",
    items: [{ href: "/admin/workspace", label: "Workspace", icon: "workspace", prefix: true }],
  },
];

const [wordmarkHead, wordmarkTail] = splitWordmark(branding.name);

/** Routes that render their own full-bleed chrome instead of the studio shell. */
const BARE_ROUTES = ["/", "/start", "/admin/login", "/admin/report"];

export function StudioShell({
  pairs,
  stats,
  children,
}: {
  pairs: NavPair[];
  stats: BundleStats;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  if (BARE_ROUTES.includes(pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        pairs={pairs}
        stats={stats}
        pathname={pathname}
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  pairs,
  stats,
  pathname,
  drawerOpen,
  onClose,
}: {
  pairs: NavPair[];
  stats: BundleStats;
  pathname: string;
  drawerOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40 bg-bg-deep/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cx(
          "no-print fixed inset-y-0 left-0 z-50 flex w-[16.5rem] flex-col border-r border-line bg-panel-solid transition-transform duration-300",
          "lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 border-b border-line px-4 py-4">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[15px] font-bold text-white"
            style={{ background: "linear-gradient(140deg, #7a98f8, #3852d7)" }}
          >
            {branding.shortName.slice(0, 1)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold tracking-tight text-ink">
              {wordmarkHead} <span className="font-normal text-muted">{wordmarkTail}</span>
            </span>
            <span className="tnum block text-[10px] text-faint">
              {stats.pairs} pairs · {stats.models} models · {stats.clips} clips
            </span>
          </span>
        </Link>

        <nav className="thin-scroll flex-1 overflow-y-auto px-2.5 py-3" aria-label="Studio">
          {GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <PairProgress pairs={pairs} pathname={pathname} />
        </nav>

        <div className="border-t border-line px-2.5 py-2.5">
          <PaletteHint />
        </div>
      </aside>
    </>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.prefix
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : pathname === item.href;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
        active
          ? "bg-accent-soft font-medium text-accent"
          : "text-muted hover:bg-sunken hover:text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-accent transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <NavIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** How much of each pair this browser has scored — the studio's own progress. */
function PairProgress({ pairs, pathname }: { pairs: NavPair[]; pathname: string }) {
  const ratings = useRatingsStore((state) => state.ratings);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <div className="mb-2">
      <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
        Pairs
      </p>
      <ul className="space-y-0.5">
        {pairs.map((pair) => {
          const href = `/pairs/${pair.slug}`;
          const active = pathname === href;
          const done = hydrated ? ratedCount(ratings[pair.slug]) : 0;
          const complete = done >= pair.models;

          return (
            <li key={pair.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
                  active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                <span className="tnum font-mono text-[10px] text-faint">
                  {String(pair.index).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate">{pair.name}</span>
                {done > 0 ? (
                  <span
                    className={cx(
                      "tnum shrink-0 rounded-full px-1.5 text-[9px] font-semibold",
                      complete ? "bg-teal-soft text-teal" : "bg-sunken text-faint",
                    )}
                    title={`${done} of ${pair.models} models rated`}
                  >
                    {done}/{pair.models}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PaletteHint() {
  const setOpen = usePaletteStore((state) => state.setOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-faint transition-colors hover:bg-sunken hover:text-ink"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" strokeLinecap="round" />
      </svg>
      <span className="flex-1 text-left">Jump to…</span>
      <kbd className="rounded border border-line-strong bg-sunken px-1 font-mono text-[9px]">
        ctrl K
      </kbd>
    </button>
  );
}

function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-ink lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M2 4.5h12M2 8h12M2 11.5h12" strokeLinecap="round" />
        </svg>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <ListenerBadge />
        <ThemeToggle />
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("vc-listening-studio.theme", next);
    } catch {
      // Private mode: the switch still applies for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {theme === "dark" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function NavIcon({ name }: { name: IconName }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "shrink-0",
    "aria-hidden": true,
  };

  switch (name) {
    case "collections":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
        </svg>
      );
    case "pairs":
      return (
        <svg {...common}>
          <path d="M4 8h5M15 8h5M4 16h5M15 16h5" />
          <circle cx="12" cy="8" r="2.2" />
          <circle cx="12" cy="16" r="2.2" />
        </svg>
      );
    case "models":
      return (
        <svg {...common}>
          <rect x="7" y="7" width="10" height="10" rx="2.4" />
          <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
        </svg>
      );
    case "samples":
      return (
        <svg {...common}>
          <path d="M3 12h2M7 7v10M11 4v16M15 9v6M19 11h2" />
        </svg>
      );
    case "blind":
      return (
        <svg {...common}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <path d="m4 20 16-16" />
        </svg>
      );
    case "scores":
      return (
        <svg {...common}>
          <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
        </svg>
      );
    case "everyone":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5.5a3.2 3.2 0 0 1 0 5M18 20a6 6 0 0 0-2-4.5" />
        </svg>
      );
    case "workspace":
      return (
        <svg {...common}>
          <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-10Z" />
        </svg>
      );
    case "data":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
      );
  }
}
