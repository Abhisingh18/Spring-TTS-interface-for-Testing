import type { ReactNode } from "react";

import { cx } from "@/lib/format";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "teal" | "amber";
  className?: string;
}) {
  const tones = {
    neutral: "border-line text-muted",
    accent: "border-accent/40 text-accent bg-accent-soft",
    teal: "border-teal/40 text-teal bg-teal-soft",
    amber: "border-amber/40 text-amber",
  } as const;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="panel rounded-2xl px-4 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="tnum mt-1.5 text-2xl font-semibold text-ink">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function SectionHeading({
  step,
  title,
  description,
  tone = "accent",
  actions,
}: {
  step?: string;
  title: string;
  description?: string;
  tone?: "accent" | "teal";
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {step ? (
            <span
              className={cx(
                "grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold",
                tone === "teal" ? "border-teal/50 text-teal" : "border-accent/50 text-accent",
              )}
            >
              {step}
            </span>
          ) : null}
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function KeyCap({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-line-strong bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  );
}
