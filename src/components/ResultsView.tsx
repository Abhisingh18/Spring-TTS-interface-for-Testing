"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FeedbackBox } from "@/components/FeedbackBox";
import { ScoreTable } from "@/components/ScoreTable";
import { SignInNotice } from "@/components/SignIn";
import { SectionHeading, StatTile } from "@/components/ui";
import { cx } from "@/lib/format";
import { downloadFile, summariseBlind, summariseRatings } from "@/lib/results";
import type { ModelInfo, Pair } from "@/lib/types";
import { ratedCount, toCsv, useRatingsStore } from "@/store/ratings";

type Tab = "open" | "blind";

export function ResultsView({ pairs, models }: { pairs: Pair[]; models: ModelInfo[] }) {
  const ratings = useRatingsStore((state) => state.ratings);
  const blind = useRatingsStore((state) => state.blind);
  const clearAll = useRatingsStore((state) => state.clearAll);
  const clearBlind = useRatingsStore((state) => state.clearBlind);

  const [tab, setTab] = useState<Tab>("open");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const labelOf = useMemo(() => {
    const lookup = new Map(models.map((model) => [model.key, model.label]));
    return (key: string) => lookup.get(key) ?? key;
  }, [models]);

  const pairNameOf = useMemo(() => {
    const lookup = new Map(pairs.map((pair) => [pair.slug, pair.name]));
    return (slug: string) => lookup.get(slug) ?? slug;
  }, [pairs]);

  const openSummary = useMemo(
    () => (hydrated ? summariseRatings(ratings, labelOf) : []),
    [hydrated, labelOf, ratings],
  );
  const blindSummary = useMemo(() => (hydrated ? summariseBlind(blind) : []), [blind, hydrated]);

  const scoredClips = hydrated
    ? Object.values(ratings).reduce((sum, models) => sum + ratedCount(models), 0)
    : 0;
  const pairsTouched = hydrated
    ? Object.values(ratings).filter((models) => ratedCount(models) > 0).length
    : 0;
  const totalSlots = pairs.length * models.length;

  function exportCsv() {
    downloadFile(
      `vc-listening-scores-${stamp()}.csv`,
      toCsv(ratings, blind, { pairName: pairNameOf, modelLabel: labelOf }),
      "text/csv;charset=utf-8",
    );
  }

  function exportJson() {
    downloadFile(
      `vc-listening-scores-${stamp()}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), ratings, blind }, null, 2),
      "application/json",
    );
  }

  return (
    <div className="space-y-8">
      <SignInNotice />
      <SectionHeading
        title="Your scores"
        description="Scores are saved as you go and, once you have added your name, counted in the shared results. Export them here to take the session anywhere."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="rounded-xl border border-line px-3.5 py-2 text-sm text-ink transition-colors hover:border-line-strong"
            >
              Export JSON
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Clips scored"
          value={`${scoredClips}/${totalSlots}`}
          hint={`${pairsTouched} of ${pairs.length} pairs touched`}
        />
        <StatTile label="Blind trials" value={blind.length} hint="across all sessions" />
        <StatTile
          label="Models covered"
          value={`${openSummary.length}/${models.length}`}
          hint="at least one labelled score"
        />
      </div>

      <div>
        <div className="mb-3 flex gap-1.5">
          <TabButton active={tab === "open"} onClick={() => setTab("open")}>
            Labelled listening
          </TabButton>
          <TabButton active={tab === "blind"} onClick={() => setTab("blind")}>
            Blind trials
          </TabButton>
        </div>

        {tab === "open" ? (
          <>
            <ScoreTable
              rows={openSummary}
              emptyMessage="No labelled scores yet — open a pair and rate a few models."
            />
            <PairBreakdown pairs={pairs} models={models} hydrated={hydrated} />
            {openSummary.length > 0 ? (
              <DangerButton onClick={clearAll} label="Clear labelled scores" />
            ) : null}
          </>
        ) : (
          <>
            <ScoreTable
              rows={blindSummary}
              emptyMessage="No blind trials recorded yet."
            />
            {blindSummary.length > 0 ? (
              <DangerButton onClick={clearBlind} label="Clear blind trials" />
            ) : null}
          </>
        )}
      </div>

      <FeedbackBox />
    </div>
  );
}

function PairBreakdown({
  pairs,
  models,
  hydrated,
}: {
  pairs: Pair[];
  models: ModelInfo[];
  hydrated: boolean;
}) {
  const ratings = useRatingsStore((state) => state.ratings);

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
        Coverage by pair
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {pairs.map((pair) => {
          const done = hydrated ? ratedCount(ratings[pair.slug]) : 0;
          return (
            <Link
              key={pair.slug}
              href={`/pairs/${pair.slug}`}
              className="panel rounded-xl px-3 py-2.5 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ink">{pair.name}</span>
                <span className="tnum text-faint">
                  {done}/{models.length}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-teal transition-[width]"
                  style={{ width: `${(done / models.length) * 100}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg px-3 py-1.5 text-sm transition-colors",
        active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function DangerButton({ onClick, label }: { onClick: () => void; label: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (confirming) {
          onClick();
          setConfirming(false);
        } else {
          setConfirming(true);
        }
      }}
      onBlur={() => setConfirming(false)}
      className="mt-4 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
    >
      {confirming ? "Click again to confirm" : label}
    </button>
  );
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}
