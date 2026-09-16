"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { RankingChart } from "@/components/RankingChart";
import { ScoreTable } from "@/components/ScoreTable";
import { SectionHeading, StatTile } from "@/components/ui";
import { cx } from "@/lib/format";
import { summariseRecords } from "@/lib/results";
import type { ModelInfo } from "@/lib/types";
import type { Snapshot } from "@/lib/storage/types";

type Tab = "models" | "pairs" | "people" | "feedback";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "models", label: "Model ranking" },
  { id: "pairs", label: "By pair" },
  { id: "people", label: "Participants" },
  { id: "feedback", label: "Feedback" },
];

export interface PairRef {
  slug: string;
  name: string;
}

export function AdminDashboard({
  snapshot,
  pairs,
  models,
  storage,
}: {
  snapshot: Snapshot;
  pairs: PairRef[];
  models: ModelInfo[];
  storage: string;
}) {
  const [tab, setTab] = useState<Tab>("models");

  const labelOf = useMemo(() => {
    const lookup = new Map(models.map((model) => [model.key, model.label]));
    return (key: string) => lookup.get(key) ?? key;
  }, [models]);

  const pairNameOf = useMemo(() => {
    const lookup = new Map(pairs.map((pair) => [pair.slug, pair.name]));
    return (slug: string) => lookup.get(slug) ?? slug;
  }, [pairs]);

  const scored = useMemo(
    () =>
      snapshot.ratings.filter(
        (rating) => rating.naturalness !== null || rating.similarity !== null,
      ),
    [snapshot.ratings],
  );

  const overall = useMemo(() => summariseRecords(scored, labelOf), [labelOf, scored]);

  const contributors = useMemo(
    () => new Set(scored.map((rating) => rating.participantId)).size,
    [scored],
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Everyone's ratings"
        description={`Live totals across every participant. Submissions are stored in ${storage}.`}
        actions={<ExportButtons hasData={scored.length > 0} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Participants"
          value={snapshot.participants.length}
          hint={`${contributors} have scored something`}
        />
        <StatTile
          label="Scores"
          value={scored.length}
          hint={`out of ${pairs.length * models.length} per person`}
        />
        <StatTile
          label="Models covered"
          value={`${overall.length}/${models.length}`}
          hint="with at least one score"
        />
        <StatTile
          label="Written feedback"
          value={snapshot.feedback.length}
          hint="one entry per participant"
        />
      </div>

      {scored.length === 0 ? (
        <p className="panel rounded-2xl px-4 py-10 text-center text-sm text-muted">
          Nothing submitted yet. Share the link, ask people to add their name, and their scores
          will land here.
        </p>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  tab === entry.id
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {tab === "models" ? (
            <div className="space-y-4">
              <RankingChart rows={overall} />
              <ScoreTable rows={overall} />
            </div>
          ) : null}
          {tab === "pairs" ? (
            <PairMatrix
              snapshot={snapshot}
              pairs={pairs}
              models={models}
              labelOf={labelOf}
            />
          ) : null}
          {tab === "people" ? (
            <PeopleTable snapshot={snapshot} pairNameOf={pairNameOf} />
          ) : null}
          {tab === "feedback" ? <FeedbackList snapshot={snapshot} /> : null}
        </div>
      )}
    </div>
  );
}

function ExportButtons({ hasData }: { hasData: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href="/api/admin/export?format=json"
        className={cx(
          "rounded-xl px-3.5 py-2 text-sm font-semibold transition-opacity",
          hasData ? "bg-accent text-bg hover:opacity-90" : "pointer-events-none bg-sunken text-faint",
        )}
      >
        Download JSON
      </a>
      <Link
        href="/admin/report"
        target="_blank"
        className={cx(
          "rounded-xl border border-line px-3.5 py-2 text-sm text-ink transition-colors hover:border-line-strong",
          hasData ? "" : "pointer-events-none opacity-50",
        )}
      >
        Download PDF
      </Link>
      <a
        href="/api/admin/export?format=csv"
        className={cx(
          "rounded-xl border border-line px-3.5 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink",
          hasData ? "" : "pointer-events-none opacity-50",
        )}
      >
        CSV
      </a>
    </div>
  );
}

/** Mean overall score for every pair × model cell, shaded by value. */
function PairMatrix({
  snapshot,
  pairs,
  models,
  labelOf,
}: {
  snapshot: Snapshot;
  pairs: PairRef[];
  models: ModelInfo[];
  labelOf: (key: string) => string;
}) {
  const cells = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const rating of snapshot.ratings) {
      const scores = [rating.naturalness, rating.similarity].filter(
        (value): value is number => value !== null,
      );
      if (scores.length === 0) continue;
      const key = `${rating.pairSlug}|${rating.modelKey}`;
      const entry = totals.get(key) ?? { sum: 0, count: 0 };
      entry.sum += scores.reduce((sum, value) => sum + value, 0) / scores.length;
      entry.count += 1;
      totals.set(key, entry);
    }
    return totals;
  }, [snapshot.ratings]);

  return (
    <div className="panel overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
            <th className="sticky left-0 bg-panel-solid px-4 py-2.5 font-medium">Model</th>
            {pairs.map((pair) => (
              <th key={pair.slug} className="px-2 py-2.5 text-center font-medium">
                {pair.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr key={model.key} className="border-b border-line/60 last:border-0">
              <td className="sticky left-0 bg-panel-solid px-4 py-2 font-medium text-ink">
                {labelOf(model.key)}
              </td>
              {pairs.map((pair) => {
                const entry = cells.get(`${pair.slug}|${model.key}`);
                const mean = entry ? entry.sum / entry.count : null;
                return (
                  <td key={pair.slug} className="px-2 py-2 text-center">
                    {mean === null ? (
                      <span className="text-faint">—</span>
                    ) : (
                      <span
                        className="tnum inline-block min-w-[2.6rem] rounded-md px-1.5 py-0.5 text-xs font-semibold text-ink"
                        style={{
                          background: `color-mix(in oklab, var(--accent) ${Math.round(
                            (mean / 5) * 70,
                          )}%, transparent)`,
                        }}
                        title={`${entry?.count ?? 0} rating(s)`}
                      >
                        {mean.toFixed(2)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeopleTable({
  snapshot,
  pairNameOf,
}: {
  snapshot: Snapshot;
  pairNameOf: (slug: string) => string;
}) {
  const rows = useMemo(() => {
    const counts = new Map<string, { scores: number; pairs: Set<string>; last: string }>();
    for (const rating of snapshot.ratings) {
      if (rating.naturalness === null && rating.similarity === null) continue;
      const entry = counts.get(rating.participantId) ?? {
        scores: 0,
        pairs: new Set<string>(),
        last: rating.updatedAt,
      };
      entry.scores += 1;
      entry.pairs.add(rating.pairSlug);
      if (rating.updatedAt > entry.last) entry.last = rating.updatedAt;
      counts.set(rating.participantId, entry);
    }

    return snapshot.participants
      .map((participant) => {
        const entry = counts.get(participant.id);
        return {
          ...participant,
          scores: entry?.scores ?? 0,
          pairs: entry ? [...entry.pairs].map(pairNameOf) : [],
          last: entry?.last ?? participant.lastSeenAt,
        };
      })
      .sort((a, b) => b.scores - a.scores);
  }, [pairNameOf, snapshot.participants, snapshot.ratings]);

  return (
    <div className="panel overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 text-right font-medium">Scores</th>
            <th className="px-4 py-2.5 font-medium">Pairs covered</th>
            <th className="px-4 py-2.5 font-medium">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line/60 last:border-0">
              <td className="px-4 py-2 font-medium text-ink" dir="auto">
                {row.name}
              </td>
              <td className="tnum px-4 py-2 text-right text-muted">{row.scores}</td>
              <td className="px-4 py-2 text-xs text-muted">
                {row.pairs.length ? row.pairs.join(", ") : "—"}
              </td>
              <td className="px-4 py-2 text-xs text-faint">
                {new Date(row.last).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedbackList({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot.feedback.length === 0) {
    return (
      <p className="panel rounded-2xl px-4 py-8 text-center text-sm text-muted">
        No written feedback yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {[...snapshot.feedback]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((entry) => (
          <li key={entry.participantId} className="panel rounded-2xl p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-ink" dir="auto">
                {entry.participantName}
              </span>
              <span className="text-xs text-faint">
                {new Date(entry.updatedAt).toLocaleString()}
              </span>
            </div>
            <p dir="auto" className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {entry.text}
            </p>
          </li>
        ))}
    </ul>
  );
}
