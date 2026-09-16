import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectionProgress } from "@/components/CollectionProgress";
import { MiniWave } from "@/components/landing/MiniWave";
import { Badge, StatTile } from "@/components/ui";
import { getCollection, listCollections } from "@/lib/collections";
import { accentFor } from "@/lib/palette";

export async function generateStaticParams() {
  const collections = await listCollections();
  return collections.map((collection) => ({ id: collection.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollection(id);
  return { title: collection ? collection.name : "Collection not found" };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) notFound();

  const models = collection.pairs[0]?.models ?? [];

  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> All collections
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{collection.name}</h1>
          {collection.languageNative ? (
            <span dir="auto" className="text-xl text-muted">
              {collection.languageNative}
            </span>
          ) : null}
          <Badge tone="accent">{collection.task}</Badge>
        </div>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {collection.description}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pairs" value={collection.stats.pairs} hint="source → target routes" />
        <StatTile label="Models" value={collection.stats.models} hint="same order everywhere" />
        <StatTile label="Clips" value={collection.stats.clips} hint="all at 16 kHz" />
        <StatTile
          label="Listening time"
          value={`${Math.round(collection.stats.totalSeconds / 60)} min`}
          hint="end to end"
        />
      </div>

      <CollectionProgress
        pairs={collection.pairs.map((pair) => ({
          slug: pair.slug,
          name: pair.name,
          index: pair.index,
          models: pair.models.length,
          sourceDialect: pair.sourceDialect,
          targetDialect: pair.targetDialect,
          sourceCorpus: pair.sourceCorpus,
          targetCorpus: pair.targetCorpus,
          sourceText: pair.sourceText,
          hasNote: Boolean(pair.note),
        }))}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Models in this collection
        </h2>
        <div className="flex flex-wrap gap-2">
          {models.map((clip, index) => (
            <Link
              key={clip.key}
              href={`/models/${clip.key}`}
              className="panel flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-ink transition-colors hover:border-line-strong"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: accentFor(clip.label.split("(")[0]?.trim() ?? "", index) }}
                aria-hidden="true"
              />
              {clip.label}
              <MiniWave
                seed={clip.key}
                color="var(--wave-idle)"
                bars={12}
                className="h-3 w-10 opacity-60"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
