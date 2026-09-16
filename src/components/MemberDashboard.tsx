"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ScoreTable } from "@/components/ScoreTable";
import { SignInNotice } from "@/components/SignIn";
import { cx } from "@/lib/format";
import { summariseRatings } from "@/lib/results";
import { useListenerStore } from "@/store/listener";
import { ratedCount, useRatingsStore } from "@/store/ratings";

export interface DashboardCollection {
  id: string;
  name: string;
  languageNative: string | null;
  pairs: Array<{ slug: string; name: string; index: number; models: number }>;
}

export interface DashboardModel {
  key: string;
  label: string;
}

/**
 * Everything a member needs and nothing else: how far through they are, what
 * they scored, and one button that takes them back to the next unrated pair.
 */
export function MemberDashboard({
  collections,
  models,
}: {
  collections: DashboardCollection[];
  models: DashboardModel[];
}) {
  const listener = useListenerStore((state) => state.listener);
  const ratings = useRatingsStore((state) => state.ratings);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const labelOf = useMemo(() => {
    const lookup = new Map(models.map((model) => [model.key, model.label]));
    return (key: string) => lookup.get(key) ?? key;
  }, [models]);

  const progress = useMemo(
    () =>
      collections.map((collection) => {
        const pairs = collection.pairs.map((pair) => ({
          ...pair,
          done: hydrated ? ratedCount(ratings[pair.slug]) : 0,
        }));
        const total = pairs.reduce((sum, pair) => sum + pair.models, 0);
        const done = pairs.reduce((sum, pair) => sum + pair.done, 0);
        const next = pairs.find((pair) => pair.done < pair.models) ?? pairs[0];
        return { collection, pairs, total, done, next, complete: total > 0 && done >= total };
      }),
    [collections, hydrated, ratings],
  );

  const total = progress.reduce((sum, entry) => sum + entry.total, 0);
  const done = progress.reduce((sum, entry) => sum + entry.done, 0);
  const everything = total > 0 && done >= total;

  const myScores = useMemo(
    () => (hydrated ? summariseRatings(ratings, labelOf) : []),
    [hydrated, labelOf, ratings],
  );

  return (
    <div className="space-y-7">
      <SignInNotice />

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
          Your dashboard
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
          {listener ? (
            <>
              Hello,{" "}
              <span dir="auto" className="text-accent">
                {listener.name}
              </span>
            </>
          ) : (
            "Your listening progress"
          )}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {everything
            ? "You have scored every clip. Thank you — nothing else is needed from you."
            : "Open a file, listen to each clip and give it two scores. You can stop and come back whenever you like."}
        </p>
      </header>

      {/* ------------------------------------------------ overall ring -- */}
      <section className="panel flex flex-wrap items-center gap-6 rounded-2xl p-5">
        <ProgressRing done={done} total={total} ready={hydrated} />

        <div className="min-w-0 flex-1">
          <p className="tnum text-2xl font-semibold text-ink">
            {hydrated ? `${done} of ${total}` : "—"}
            <span className="ml-2 text-sm font-normal text-muted">clips scored</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className={cx(
                "h-full rounded-full transition-[width] duration-700",
                everything ? "bg-teal" : "bg-accent",
              )}
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
          {!everything && progress[0]?.next ? (
            <Link
              href={`/pairs/${progress.find((entry) => !entry.complete)?.next?.slug ?? progress[0].next.slug}`}
              className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              {done === 0 ? "Start rating" : "Continue where you left off"}
            </Link>
          ) : null}
          {everything ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-teal/40 bg-teal-soft px-4 py-2.5 text-sm font-medium text-teal">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              All done — your scores are saved
            </p>
          ) : null}
        </div>
      </section>

      {/* ----------------------------------------------------- my files -- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Your files
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {progress.map(({ collection, total: slots, done: scored, next, complete }) => (
            <Link
              key={collection.id}
              href={complete ? `/collections/${collection.id}` : `/pairs/${next?.slug ?? ""}`}
              className="panel lift flex min-w-0 flex-col rounded-2xl p-4"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-ink">{collection.name}</h3>
                  {collection.languageNative ? (
                    <span dir="auto" className="text-[11px] text-faint">
                      {collection.languageNative}
                    </span>
                  ) : null}
                </div>
                <span
                  className={cx(
                    "tnum shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    complete ? "bg-teal-soft text-teal" : "bg-accent-soft text-accent",
                  )}
                >
                  {complete ? "done" : `${scored}/${slots}`}
                </span>
              </div>

              <span className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
                <span
                  className={cx("block h-full rounded-full", complete ? "bg-teal" : "bg-accent")}
                  style={{ width: `${slots ? (scored / slots) * 100 : 0}%` }}
                />
              </span>

              <p className="mt-2.5 text-[11px] text-muted">
                {complete
                  ? "Every clip scored"
                  : next
                    ? `Next up · ${next.name}`
                    : "Nothing to score"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- my scores -- */}
      {myScores.length > 0 ? (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
            How you scored the models
          </h2>
          <p className="mb-3 text-xs text-muted">
            Your own averages only — not anyone else&rsquo;s, and not the study result.
          </p>
          <ScoreTable rows={myScores} emptyMessage="Nothing scored yet." />
        </section>
      ) : null}
    </div>
  );
}

function ProgressRing({
  done,
  total,
  ready,
}: {
  done: number;
  total: number;
  ready: boolean;
}) {
  const fraction = total > 0 ? Math.min(done / total, 1) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const complete = ready && total > 0 && done >= total;

  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--sunken)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={complete ? "var(--teal)" : "var(--accent)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="tnum text-lg font-semibold text-ink">
          {ready ? `${Math.round(fraction * 100)}%` : "—"}
        </span>
      </span>
    </div>
  );
}
