"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MiniWave } from "@/components/landing/MiniWave";
import { cx } from "@/lib/format";
import { ratedCount, useRatingsStore } from "@/store/ratings";

export interface CollectionPair {
  slug: string;
  name: string;
  index: number;
  models: number;
  sourceDialect: string;
  targetDialect: string;
  sourceCorpus: string;
  targetCorpus: string;
  sourceText: string;
  hasNote: boolean;
}

/**
 * The pair list for a collection, with this member's own progress on each one
 * and a single button that jumps to wherever they left off.
 */
export function CollectionProgress({ pairs }: { pairs: CollectionPair[] }) {
  const ratings = useRatingsStore((state) => state.ratings);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const scored = pairs.map((pair) => (hydrated ? ratedCount(ratings[pair.slug]) : 0));
  const totalSlots = pairs.reduce((sum, pair) => sum + pair.models, 0);
  const totalDone = scored.reduce((sum, value) => sum + value, 0);

  // Resume on the first pair that is not finished, else the first pair.
  const resumeIndex = scored.findIndex((done, index) => done < (pairs[index]?.models ?? 0));
  const resume = pairs[resumeIndex === -1 ? 0 : resumeIndex];

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Pairs</h2>
          <p className="tnum mt-0.5 text-xs text-muted">
            {hydrated ? `${totalDone} of ${totalSlots} model scores done` : "Loading your progress…"}
          </p>
        </div>
        {resume ? (
          <Link
            href={`/pairs/${resume.slug}`}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            {totalDone === 0 ? "Start listening" : "Continue where you left off"}
          </Link>
        ) : null}
      </div>

      {hydrated ? (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700"
            style={{ width: `${totalSlots ? (totalDone / totalSlots) * 100 : 0}%` }}
          />
        </div>
      ) : null}

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pairs.map((pair, index) => {
          const done = scored[index] ?? 0;
          const complete = done >= pair.models;

          return (
            <li key={pair.slug}>
              <Link
                href={`/pairs/${pair.slug}`}
                className="panel lift group flex h-full flex-col rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="tnum font-mono text-[11px] text-faint">
                    {String(pair.index).padStart(2, "0")}
                  </span>
                  <span
                    className={cx(
                      "tnum rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      complete
                        ? "bg-teal-soft text-teal"
                        : done > 0
                          ? "bg-accent-soft text-accent"
                          : "bg-sunken text-faint",
                    )}
                  >
                    {complete ? "done" : `${done}/${pair.models}`}
                  </span>
                </div>

                <h3 className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                  {pair.sourceDialect}
                  <span className="text-accent" aria-hidden="true">
                    →
                  </span>
                  {pair.targetDialect}
                </h3>
                <p className="mt-0.5 text-[11px] text-faint">
                  {pair.sourceCorpus} → {pair.targetCorpus}
                </p>

                <MiniWave
                  seed={pair.slug}
                  color={complete ? "var(--teal)" : "var(--accent)"}
                  bars={28}
                  className="mt-2.5 h-6 w-full opacity-60 transition-opacity group-hover:opacity-100"
                />

                <p dir="auto" className="arabic mt-2 line-clamp-2 text-[13px] leading-7 text-muted">
                  {pair.sourceText}
                </p>

                <span className="mt-2.5 h-1 overflow-hidden rounded-full bg-sunken">
                  <span
                    className={cx("block h-full rounded-full", complete ? "bg-teal" : "bg-accent")}
                    style={{ width: `${(done / pair.models) * 100}%` }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
