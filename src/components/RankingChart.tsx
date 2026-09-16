"use client";

import { useState } from "react";

import { accentFor } from "@/lib/palette";
import type { ModelSummary } from "@/lib/results";

type Measure = "overall" | "naturalness" | "similarity";

const MEASURES: Array<{ id: Measure; label: string }> = [
  { id: "overall", label: "Overall" },
  { id: "naturalness", label: "Naturalness" },
  { id: "similarity", label: "Speaker similarity" },
];

/**
 * Ranked bars for one measure at a time. The bar length carries the magnitude in
 * a single hue; the dot beside each name carries model identity, so ten
 * categories never turn into ten competing bar colours. Every bar is directly
 * labelled, so the chart never depends on colour to be read.
 */
export function RankingChart({ rows }: { rows: ModelSummary[] }) {
  const [measure, setMeasure] = useState<Measure>("overall");
  const [hovered, setHovered] = useState<string | null>(null);

  const ranked = [...rows]
    .filter((row) => row[measure] !== null)
    .sort((a, b) => (b[measure] ?? 0) - (a[measure] ?? 0));

  if (ranked.length === 0) {
    return (
      <p className="panel rounded-2xl px-4 py-10 text-center text-sm text-muted">
        Nothing scored yet.
      </p>
    );
  }

  return (
    <figure className="panel rounded-2xl p-5">
      <figcaption className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-ink">
            Mean {MEASURES.find((entry) => entry.id === measure)?.label.toLowerCase()} by model
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            Scale 1–5 · n is the number of scores behind each bar
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-line p-0.5">
          {MEASURES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setMeasure(entry.id)}
              aria-pressed={measure === entry.id}
              className={
                measure === entry.id
                  ? "rounded-md bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                  : "rounded-md px-2.5 py-1 text-xs text-muted transition-colors hover:text-ink"
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
      </figcaption>

      <ul className="space-y-2.5">
        {ranked.map((row, position) => {
          const value = row[measure] ?? 0;
          const identity = accentFor(row.modelLabel.split("(")[0]?.trim() ?? "", position);
          const active = hovered === row.modelKey;
          return (
            <li
              key={row.modelKey}
              className="grid grid-cols-[1.4rem_minmax(7rem,11rem)_1fr_2.6rem] items-center gap-2.5 sm:gap-3"
              onMouseEnter={() => setHovered(row.modelKey)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="tnum text-right font-mono text-[11px] text-faint">
                {position + 1}
              </span>

              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: identity }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm text-ink">{row.modelLabel}</span>
              </span>

              <span className="relative flex h-5 items-center">
                <span className="absolute inset-x-0 h-2 rounded-full bg-sunken" aria-hidden="true" />
                <span
                  className="relative h-2 rounded-full transition-[width,opacity] duration-500"
                  style={{
                    width: `${(value / 5) * 100}%`,
                    background: "var(--accent)",
                    opacity: hovered && !active ? 0.45 : 1,
                  }}
                />
                {active ? (
                  <span className="tnum absolute -top-6 left-0 z-10 rounded-md border border-line bg-panel-raised px-1.5 py-0.5 text-[11px] text-ink shadow-sm">
                    {row.modelLabel} · {value.toFixed(2)} of 5 · n {row.count}
                  </span>
                ) : null}
              </span>

              <span className="tnum text-right text-sm font-semibold text-ink">
                {value.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-line pt-2.5 text-[11px] text-faint">
        Bar length is the mean score; the dot is the model&rsquo;s colour used throughout the
        studio. Exact numbers for every measure are in the table below.
      </p>
    </figure>
  );
}
