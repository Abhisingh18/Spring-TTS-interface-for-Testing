import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CollectionManager } from "@/components/admin/CollectionManager";
import { Badge } from "@/components/ui";
import { isAdmin } from "@/lib/admin-auth";
import { getWorkspace } from "@/lib/workspace/store";

export const metadata: Metadata = { title: "Manage collection" };
export const dynamic = "force-dynamic";

export default async function ManageCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await isAdmin())) {
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/workspace/${id}`)}`);
  }

  const snapshot = await getWorkspace();
  const collection = snapshot.collections.find((entry) => entry.id === id);
  if (!collection) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/workspace"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> Workspace
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{collection.name}</h1>
          {collection.languageNative ? (
            <span dir="auto" className="text-xl text-muted">
              {collection.languageNative}
            </span>
          ) : null}
          <Badge tone={collection.status === "published" ? "teal" : "neutral"}>
            {collection.status}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          {collection.language} · {collection.task}
          {collection.description ? ` — ${collection.description}` : ""}
        </p>
      </header>

      <CollectionManager
        collection={collection}
        models={snapshot.models.filter((m) => m.collectionId === id).sort((a, b) => a.order - b.order)}
        items={snapshot.items.filter((i) => i.collectionId === id).sort((a, b) => a.order - b.order)}
        samples={snapshot.samples.filter((s) => s.collectionId === id)}
      />
    </div>
  );
}
