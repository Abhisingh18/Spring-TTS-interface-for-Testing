import type { Metadata } from "next";
import Link from "next/link";

import { MiniWave } from "@/components/landing/MiniWave";
import { Badge, SectionHeading } from "@/components/ui";
import { listCollections } from "@/lib/collections";

export const metadata: Metadata = {
  title: "Collections",
  description: "Pick a language benchmark to evaluate.",
};

export default async function CollectionsPage() {
  const collections = await listCollections();

  return (
    <div className="space-y-7">
      <SectionHeading
        title="What would you like to evaluate?"
        description="Each box is one benchmark — a language and a task, with its own pairs and models. Open one and work through it at your own pace; your scores are saved as you go."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/collections/${collection.id}`}
            className="panel lift group flex min-w-0 flex-col rounded-2xl p-5"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {collection.languageNative ? (
                    <span dir="auto" className="text-lg font-semibold text-ink">
                      {collection.languageNative}
                    </span>
                  ) : null}
                  <span className="text-[11px] uppercase tracking-wider text-faint">
                    {collection.language}
                  </span>
                </div>
                <h2 className="mt-1 text-balance text-lg font-semibold tracking-tight text-ink">
                  {collection.name}
                </h2>
              </div>
              <Badge tone={collection.status === "ready" ? "teal" : "neutral"}>
                {collection.status}
              </Badge>
            </div>

            <p className="mt-2.5 text-sm leading-relaxed text-muted">{collection.description}</p>

            <MiniWave
              seed={collection.id}
              color="var(--accent)"
              bars={40}
              className="mt-4 h-8 w-full opacity-70 transition-opacity group-hover:opacity-100"
            />

            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line/70 pt-3 text-[11px] sm:grid-cols-4">
              {[
                ["Pairs", collection.stats.pairs],
                ["Models", collection.stats.models],
                ["Clips", collection.stats.clips],
                ["Minutes", Math.round(collection.stats.totalSeconds / 60)],
              ].map(([label, value]) => (
                <div key={label as string} className="min-w-0">
                  <dt className="text-faint">{label}</dt>
                  <dd className="tnum mt-0.5 text-base font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex min-w-0 items-center justify-between gap-2 text-[11px] text-faint">
              <span className="truncate">{collection.stats.corpora.join(" · ")}</span>
              <span className="shrink-0 text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Open →
              </span>
            </div>
          </Link>
        ))}

        {/* Honest placeholder: the shape is ready, the data is not here yet. */}
        <div className="rounded-2xl border border-dashed border-line p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            More languages
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Hindi, Kannada, Tamil, Telugu — any language or task can be added as its own
            collection. Each one keeps its own pairs, models and rubric, so scores never mix
            across benchmarks.
          </p>
          <p className="mt-3 font-mono text-[11px] text-faint">
            registered in src/lib/collections.ts
          </p>
        </div>
      </div>
    </div>
  );
}
