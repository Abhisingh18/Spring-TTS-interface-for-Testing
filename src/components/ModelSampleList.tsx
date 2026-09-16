"use client";

import Link from "next/link";
import { useState } from "react";

import { ClipPlayer } from "@/components/ClipPlayer";
import { PairRating } from "@/components/Rating";
import { SignInNotice } from "@/components/SignIn";
import { cx, formatDelta } from "@/lib/format";
import { REFERENCE_ACCENT } from "@/lib/palette";
import type { Clip } from "@/lib/types";

export interface ModelSampleEntry {
  pairName: string;
  pairSlug: string;
  pairIndex: number;
  sourceCorpus: string;
  targetCorpus: string;
  sourceText: string;
  drift: number;
  clip: Clip;
  source: Clip;
  target: Clip;
}

/**
 * One model across every pair. Each row plays the converted clip on its own;
 * expanding a row brings in that pair's two references so the comparison can be
 * made without leaving the model.
 */
export function ModelSampleList({
  samples,
  accent,
  modelKey,
}: {
  samples: ModelSampleEntry[];
  accent: string;
  modelKey: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<"pair" | "drift" | "length">("pair");

  const ordered = [...samples].sort((a, b) => {
    if (sort === "drift") return Math.abs(b.drift) - Math.abs(a.drift);
    if (sort === "length") return b.clip.durationSeconds - a.clip.durationSeconds;
    return a.pairIndex - b.pairIndex;
  });

  return (
    <section className="space-y-4">
      <SignInNotice />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Samples ({samples.length})
        </h2>
        <label className="flex items-center gap-2 text-xs text-muted">
          Order
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-md border border-line bg-panel-solid px-2 py-1 text-xs text-ink"
          >
            <option value="pair">Pair order</option>
            <option value="drift">Largest length drift</option>
            <option value="length">Longest clip</option>
          </select>
        </label>
      </div>

      <ul className="space-y-3">
        {ordered.map((entry) => {
          const open = expanded === entry.pairSlug;
          const heavy = Math.abs(entry.drift) > 0.5;

          return (
            <li key={entry.pairSlug} className="panel overflow-hidden rounded-2xl">
              <div className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-2.5">
                <span className="tnum font-mono text-[11px] text-faint">
                  {String(entry.pairIndex).padStart(2, "0")}
                </span>
                <Link
                  href={`/pairs/${entry.pairSlug}`}
                  className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                >
                  {entry.pairName}
                </Link>
                <span className="text-[11px] text-faint">
                  {entry.sourceCorpus} → {entry.targetCorpus}
                </span>

                <span
                  className="tnum ml-auto text-[11px]"
                  style={{ color: heavy ? "var(--amber)" : "var(--text-faint)" }}
                  title="Length difference against this pair's source clip"
                >
                  {formatDelta(entry.drift)}
                </span>

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : entry.pairSlug)}
                  aria-expanded={open}
                  className={cx(
                    "rounded-lg border px-2.5 py-1 text-[11px] transition-colors",
                    open
                      ? "border-accent/50 bg-accent-soft text-accent"
                      : "border-line text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {open ? "Hide references" : "Compare references"}
                </button>
              </div>

              <div className="p-3.5">
                <div className={cx("grid gap-3", open ? "lg:grid-cols-3" : "")}>
                  {open ? (
                    <>
                      <ClipPlayer
                        clip={entry.source}
                        accent={REFERENCE_ACCENT.source}
                        compact
                        eager
                      />
                      <ClipPlayer
                        clip={entry.target}
                        accent={REFERENCE_ACCENT.target}
                        compact
                        eager
                      />
                    </>
                  ) : null}

                  <ClipPlayer
                    clip={entry.clip}
                    accent={accent}
                    compact={open}
                    referenceDuration={entry.source.durationSeconds}
                    footer={
                      <PairRating pairSlug={entry.pairSlug} modelKey={modelKey} accent={accent} />
                    }
                  />
                </div>

                {open ? (
                  <p dir="auto" className="arabic mt-3 border-t border-line pt-3 text-[15px] text-muted">
                    {entry.sourceText}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
