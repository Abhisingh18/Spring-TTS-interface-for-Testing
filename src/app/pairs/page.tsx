import type { Metadata } from "next";

import { requireResearcher } from "@/lib/guard";
import Link from "next/link";

import { Badge, SectionHeading, StatTile } from "@/components/ui";
import { getBundle } from "@/lib/bundle";
import { formatBytes } from "@/lib/format";
import { accentFor } from "@/lib/palette";

export const metadata: Metadata = {
  title: "All pairs",
  description: "The ten source–target pairs in the 16 kHz listening bundle.",
};

// Reads the session to keep members out, so it cannot be prerendered.
export const dynamic = "force-dynamic";

export default async function PairsIndexPage() {
  await requireResearcher();
  const { pairs, models, stats, meta } = await getBundle();
  const minutes = Math.round(stats.totalSeconds / 60);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="All pairs"
        description="Each pair gives you a source clip that carries the words and a target clip that carries the voice. Every model tries to say the source words in the target voice."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pairs" value={stats.pairs} hint="source → target dialect routes" />
        <StatTile label="Models" value={stats.models} hint="identical order in every pair" />
        <StatTile
          label="Clips"
          value={stats.clips}
          hint={`${minutes} minutes · ${formatBytes(stats.totalBytes)}`}
        />
        <StatTile
          label="Resampled"
          value={`${stats.resampledClips}/${stats.clips}`}
          hint={`${stats.preservedClips} kept byte-for-byte`}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Models in the bundle
        </h2>
        <div className="flex flex-wrap gap-2">
          {models.map((model) => (
            <span
              key={model.key}
              className="panel flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-ink"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: accentFor(model.family, model.order) }}
                aria-hidden="true"
              />
              {model.label}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">Pairs</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pairs.map((pair) => (
            <Link
              key={pair.slug}
              href={`/pairs/${pair.slug}`}
              className="panel group rounded-2xl p-4 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center justify-between">
                <span className="tnum font-mono text-[11px] text-faint">
                  {String(pair.index).padStart(2, "0")} / {pairs.length}
                </span>
                {pair.note ? <Badge tone="amber">mapping note</Badge> : null}
              </div>

              <h3 className="mt-1.5 flex items-center gap-2 text-lg font-semibold text-ink">
                <span>{pair.sourceDialect}</span>
                <span className="text-faint" aria-hidden="true">
                  →
                </span>
                <span>{pair.targetDialect}</span>
              </h3>

              <p className="mt-1 text-xs text-muted">
                {pair.sourceCorpus} → {pair.targetCorpus}
              </p>

              <p dir="auto" className="arabic mt-3 line-clamp-2 text-[15px] leading-8 text-muted">
                {pair.sourceText}
              </p>

              <div className="tnum mt-3 flex items-center gap-3 border-t border-line/70 pt-2.5 text-[11px] text-faint">
                <span>source {pair.source.durationSeconds.toFixed(1)}s</span>
                <span>target {pair.target.durationSeconds.toFixed(1)}s</span>
                <span className="ml-auto text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-faint">
        Audio comes from{" "}
        <code className="font-mono text-[11px] text-muted">{meta.bundleDir}</code> — nothing is
        re-encoded.
      </p>
    </div>
  );
}
