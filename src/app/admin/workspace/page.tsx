import type { Metadata } from "next";
import Link from "next/link";

import { AdminGate } from "@/components/AdminGate";
import { NewCollectionForm } from "@/components/admin/NewCollectionForm";
import { SectionHeading, StatTile, Badge } from "@/components/ui";
import { isAdmin, usingDefaultPassword, adminEmail } from "@/lib/admin-auth";
import { getWorkspace, workspaceLocation } from "@/lib/workspace/store";

export const metadata: Metadata = { title: "Workspace" };
export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  if (!(await isAdmin())) return <AdminGate />;

  const snapshot = await getWorkspace();
  const location = workspaceLocation();

  return (
    <div className="space-y-7">
      <SectionHeading
        title="Workspace"
        description="Create a collection, give it model columns, add the utterances you want compared, and upload a clip into every cell."
      />

      {usingDefaultPassword() ? (
        <p className="panel rounded-2xl border-amber/40 px-4 py-3 text-sm text-muted">
          <span className="font-medium text-amber">Default password in use · </span>
          Signed in as <code className="font-mono text-ink">{adminEmail()}</code> with the shipped
          password. Set <code className="font-mono">ADMIN_PASSWORD</code> before this reaches
          anyone outside the lab.
        </p>
      ) : null}

      {location.ephemeral ? (
        <p className="panel rounded-2xl border-amber/40 px-4 py-3 text-sm text-muted">
          <span className="font-medium text-amber">Temporary storage · </span>
          Uploads land in <code className="font-mono text-ink">{location.dir}</code>, which this
          host discards between requests. Set <code className="font-mono">WORKSPACE_DIR</code> to a
          persistent volume, or attach object storage.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Collections" value={snapshot.collections.length} hint="benchmarks you own" />
        <StatTile label="Models" value={snapshot.models.length} hint="columns across all collections" />
        <StatTile label="Rows" value={snapshot.items.length} hint="utterances" />
        <StatTile label="Clips" value={snapshot.samples.length} hint="uploaded audio" />
      </div>

      <NewCollectionForm />

      {snapshot.collections.length === 0 ? (
        <p className="panel rounded-2xl px-4 py-10 text-center text-sm text-muted">
          No collections yet. Create one above — it becomes a grid of models × utterances.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.collections.map((collection) => {
            const models = snapshot.models.filter((m) => m.collectionId === collection.id).length;
            const items = snapshot.items.filter((i) => i.collectionId === collection.id).length;
            const clips = snapshot.samples.filter((s) => s.collectionId === collection.id).length;

            return (
              <Link
                key={collection.id}
                href={`/admin/workspace/${collection.id}`}
                className="panel lift flex min-w-0 flex-col rounded-2xl p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <h2 className="min-w-0 truncate text-[15px] font-semibold text-ink">
                    {collection.name}
                  </h2>
                  <Badge tone={collection.status === "published" ? "teal" : "neutral"}>
                    {collection.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-faint">
                  {collection.language} · {collection.task}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-[11px]">
                  {[["Models", models], ["Rows", items], ["Clips", clips]].map(([label, value]) => (
                    <div key={label as string} className="min-w-0">
                      <dt className="text-faint">{label}</dt>
                      <dd className="tnum mt-0.5 text-base font-semibold text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
