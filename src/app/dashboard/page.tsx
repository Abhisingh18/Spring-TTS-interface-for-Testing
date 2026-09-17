import type { Metadata } from "next";
import Link from "next/link";

import { MemberDashboard } from "@/components/MemberDashboard";
import { Badge } from "@/components/ui";
import { getBundle } from "@/lib/bundle";
import { listCollections } from "@/lib/collections";
import { currentListener } from "@/lib/session";
import { listMemberCollections } from "@/lib/workspace/member-view";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your listening progress and your own scores.",
};

// Reads the session to compute this member's own progress.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const listener = await currentListener();
  const [collections, { models }, workspaceCollections] = await Promise.all([
    listCollections(),
    getBundle(),
    listMemberCollections(listener),
  ]);

  return (
    <div className="space-y-9">
      {workspaceCollections.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
            Your files
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {workspaceCollections.map((collection) => {
              const complete = collection.myDone >= collection.ratableCells;
              return (
                <Link
                  key={collection.id}
                  href={`/collections/workspace/${collection.id}`}
                  className="panel lift flex min-w-0 flex-col rounded-2xl p-4"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate text-[15px] font-semibold text-ink">
                      {collection.name}
                    </h3>
                    <Badge tone={complete ? "teal" : "accent"}>
                      {complete ? "done" : `${collection.myDone}/${collection.ratableCells}`}
                    </Badge>
                  </div>
                  <span className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${collection.ratableCells ? (collection.myDone / collection.ratableCells) * 100 : 0}%`,
                        background: complete ? "var(--teal)" : "var(--accent)",
                      }}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <MemberDashboard
        collections={collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          languageNative: collection.languageNative ?? null,
          pairs: collection.pairs.map((pair) => ({
            slug: pair.slug,
            name: pair.name,
            index: pair.index,
            models: pair.models.length,
          })),
        }))}
        models={models.map(({ key, label }) => ({ key, label }))}
      />
    </div>
  );
}
