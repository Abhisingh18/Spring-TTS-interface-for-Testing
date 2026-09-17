import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui";
import { WorkspaceRatingBoard } from "@/components/WorkspaceRatingBoard";
import { currentListener } from "@/lib/session";
import { getMemberCollection } from "@/lib/workspace/member-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listener = await currentListener();
  const collection = await getMemberCollection(id, listener);
  return { title: collection ? collection.name : "Folder not found" };
}

export default async function WorkspaceCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listener = await currentListener();
  const collection = await getMemberCollection(id, listener);
  if (!collection) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> Your files
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

        {collection.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {collection.description}
          </p>
        ) : null}
      </header>

      <WorkspaceRatingBoard
        collectionId={collection.id}
        models={collection.models.map((model) => ({
          id: model.id,
          name: model.name,
          version: model.version,
        }))}
        rows={collection.rows.map((row) => ({
          item: {
            id: row.item.id,
            label: row.item.label,
            transcript: row.item.transcript,
          },
          source: row.source ? { id: row.source.id } : null,
          target: row.target ? { id: row.target.id } : null,
          cells: row.cells.map((cell) => ({
            model: { id: cell.model.id, name: cell.model.name, version: cell.model.version },
            sample: cell.sample
              ? {
                  id: cell.sample.id,
                  durationSec: cell.sample.durationSec,
                  sampleRate: cell.sample.sampleRate,
                }
              : null,
            rating: cell.rating
              ? { naturalness: cell.rating.naturalness, similarity: cell.rating.similarity }
              : null,
          })),
        }))}
      />
    </div>
  );
}
