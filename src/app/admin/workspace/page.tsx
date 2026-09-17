import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { NewCollectionForm } from "@/components/admin/NewCollectionForm";
import { SectionHeading, StatTile, Badge } from "@/components/ui";
import { cx } from "@/lib/format";
import { isAdmin, usingDefaultPassword, adminEmail } from "@/lib/admin-auth";
import { getWorkspace, workspaceLocation } from "@/lib/workspace/store";

export const metadata: Metadata = { title: "Folders" };
export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/workspace");

  const snapshot = await getWorkspace();
  const location = workspaceLocation();

  // Only published collections are reachable by a member, so that is the
  // denominator "how much feedback is there to give" should use.
  const publishedIds = new Set(
    snapshot.collections.filter((c) => c.status === "published").map((c) => c.id),
  );
  const ratableCells = snapshot.samples.filter(
    (s) => s.role === "generated" && publishedIds.has(s.collectionId),
  ).length;

  const participants = new Map<
    string,
    { name: string; done: number; lastActive: string }
  >();
  for (const rating of snapshot.ratings) {
    if (!publishedIds.has(rating.collectionId)) continue;
    if (rating.naturalness === null && rating.similarity === null) continue;
    const existing = participants.get(rating.participantId);
    if (existing) {
      existing.done += 1;
      if (rating.updatedAt > existing.lastActive) existing.lastActive = rating.updatedAt;
    } else {
      participants.set(rating.participantId, {
        name: rating.participantName,
        done: 1,
        lastActive: rating.updatedAt,
      });
    }
  }
  const participantRows = [...participants.entries()]
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => b.done - a.done);

  return (
    <div className="space-y-7">
      <SectionHeading
        title="Folders"
        description="Create a folder, give it model columns, add the utterances you want compared, and upload a clip into every cell."
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

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Who has rated what
        </h2>
        <p className="mb-3 text-xs text-muted">
          Cells scored against {ratableCells} ratable cell{ratableCells === 1 ? "" : "s"} across
          every published collection.
        </p>

        {participantRows.length === 0 ? (
          <p className="panel rounded-2xl px-4 py-8 text-center text-sm text-muted">
            No one has scored anything yet.
          </p>
        ) : (
          <div className="panel overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Progress</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cells</th>
                  <th className="px-4 py-2.5 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {participantRows.map((row) => {
                  const complete = ratableCells > 0 && row.done >= ratableCells;
                  const percent = ratableCells > 0 ? Math.min(100, (row.done / ratableCells) * 100) : 0;
                  return (
                    <tr key={row.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-ink" dir="auto">
                        {row.name}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-sunken">
                            <span
                              className={cx(
                                "block h-full rounded-full",
                                complete ? "bg-teal" : "bg-accent",
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          {complete ? (
                            <Badge tone="teal">done</Badge>
                          ) : (
                            <span className="tnum text-xs text-faint">{Math.round(percent)}%</span>
                          )}
                        </span>
                      </td>
                      <td className="tnum px-4 py-2.5 text-right text-muted">
                        {row.done}/{ratableCells}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-faint">
                        {new Date(row.lastActive).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
