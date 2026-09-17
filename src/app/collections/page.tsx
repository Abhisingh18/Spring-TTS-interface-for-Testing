import type { Metadata } from "next";
import Link from "next/link";

import { MiniWave } from "@/components/landing/MiniWave";
import { Badge, SectionHeading } from "@/components/ui";
import { listCollections } from "@/lib/collections";
import { currentListener } from "@/lib/session";
import { listMemberCollections } from "@/lib/workspace/member-view";

export const metadata: Metadata = {
  title: "Collections",
  description: "Pick a language benchmark to evaluate.",
};

// Reads the session to merge in this member's own progress.
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const listener = await currentListener();
  const [demoCollections, workspaceCollections] = await Promise.all([
    listCollections(),
    listMemberCollections(listener),
  ]);

  return (
    <div className="space-y-9">
      <SectionHeading
        title="What would you like to evaluate?"
        description="Each box is one folder your administrator set up — open it, listen to every clip, and score it. You can stop and come back whenever you like."
      />

      {workspaceCollections.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
            Your files
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaceCollections.map((collection) => {
              const complete = collection.myDone >= collection.ratableCells;
              return (
                <Link
                  key={collection.id}
                  href={`/collections/workspace/${collection.id}`}
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
                      <h3 className="mt-1 text-balance text-lg font-semibold tracking-tight text-ink">
                        {collection.name}
                      </h3>
                    </div>
                    <Badge tone={complete ? "teal" : "accent"}>
                      {complete ? "done" : `${collection.myDone}/${collection.ratableCells}`}
                    </Badge>
                  </div>

                  {collection.description ? (
                    <p className="mt-2.5 text-sm leading-relaxed text-muted">
                      {collection.description}
                    </p>
                  ) : null}

                  <MiniWave
                    seed={collection.id}
                    color={complete ? "var(--teal)" : "var(--accent)"}
                    bars={40}
                    className="mt-4 h-8 w-full opacity-70 transition-opacity group-hover:opacity-100"
                  />

                  <span className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
                    <span
                      className="block h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${collection.ratableCells ? (collection.myDone / collection.ratableCells) * 100 : 0}%`,
                        background: complete ? "var(--teal)" : "var(--accent)",
                      }}
                    />
                  </span>

                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line/70 pt-3 text-[11px]">
                    <div className="min-w-0">
                      <dt className="text-faint">Models</dt>
                      <dd className="tnum mt-0.5 text-base font-semibold text-ink">
                        {collection.modelCount}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-faint">Utterances</dt>
                      <dd className="tnum mt-0.5 text-base font-semibold text-ink">
                        {collection.itemCount}
                      </dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Demo benchmark
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoCollections.map((collection) => (
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
                  <h3 className="mt-1 text-balance text-lg font-semibold tracking-tight text-ink">
                    {collection.name}
                  </h3>
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
        </div>
      </section>
    </div>
  );
}
