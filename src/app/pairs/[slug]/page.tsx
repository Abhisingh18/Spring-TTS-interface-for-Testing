import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PairWorkbench } from "@/components/PairWorkbench";
import { Badge } from "@/components/ui";
import { getBundle, getPair, getPairNeighbours } from "@/lib/bundle";

export async function generateStaticParams() {
  const { pairs } = await getBundle();
  return pairs.map((pair) => ({ slug: pair.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pair = await getPair(slug);
  return {
    title: pair ? `${pair.name} · pair ${String(pair.index).padStart(2, "0")}` : "Pair not found",
  };
}

export default async function PairPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [pair, bundle, neighbours] = await Promise.all([
    getPair(slug),
    getBundle(),
    getPairNeighbours(slug),
  ]);

  if (!pair) notFound();

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tnum font-mono text-xs text-faint">
            Pair {String(pair.index).padStart(2, "0")} of {bundle.pairs.length}
          </span>
          <Badge tone="teal">{pair.sourceCorpus}</Badge>
          <span className="text-faint" aria-hidden="true">
            →
          </span>
          <Badge tone="accent">{pair.targetCorpus}</Badge>

          <div className="ml-auto flex items-center gap-1.5">
            <NeighbourLink slug={neighbours.prev?.slug} name={neighbours.prev?.name} direction="prev" />
            <NeighbourLink slug={neighbours.next?.slug} name={neighbours.next?.name} direction="next" />
          </div>
        </div>

        <h1 className="mt-2 flex flex-wrap items-center gap-2.5 text-3xl font-semibold tracking-tight text-ink">
          <span>{pair.sourceDialect}</span>
          <span className="text-faint" aria-hidden="true">
            →
          </span>
          <span>{pair.targetDialect}</span>
          <span className="text-base font-normal text-faint">
            speaker {pair.targetSpeaker}
          </span>
        </h1>

        {pair.note ? (
          <p className="mt-2 rounded-xl border border-amber/30 bg-amber/5 px-3.5 py-2.5 text-sm text-muted">
            <span className="font-medium text-amber">Mapping note · </span>
            {pair.note}
          </p>
        ) : null}
      </header>

      <PairWorkbench
        pair={pair}
        models={bundle.models}
        prevSlug={neighbours.prev?.slug}
        nextSlug={neighbours.next?.slug}
      />

      <details className="panel rounded-2xl px-4 py-3 text-xs text-muted">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Pair identifiers and target mapping
        </summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field label="VC filename" value={pair.filename} mono />
          <Field label="Target utterance" value={pair.targetUtt} mono />
          <Field label="Target speaker (include list)" value={pair.listedTargetSpeaker} mono />
          <Field label="Target speaker (manifest)" value={pair.targetSpeaker} mono />
          <Field label="Bundle folder" value={`audio/${pair.folder}/`} mono />
          <Field label="Target resolution" value={bundle.meta.targetResolution} />
        </dl>
      </details>
    </div>
  );
}

function NeighbourLink({
  slug,
  name,
  direction,
}: {
  slug?: string;
  name?: string;
  direction: "prev" | "next";
}) {
  const symbol = direction === "prev" ? "←" : "→";
  if (!slug) {
    return (
      <span className="rounded-lg border border-line/60 px-2.5 py-1 text-xs text-faint/50">
        {symbol}
      </span>
    );
  }
  return (
    <Link
      href={`/pairs/${slug}`}
      className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-ink"
      title={`${direction === "prev" ? "Previous" : "Next"} pair: ${name} (${direction === "prev" ? "[" : "]"})`}
    >
      {direction === "prev" ? `${symbol} ${name}` : `${name} ${symbol}`}
    </Link>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className={mono ? "break-words font-mono text-[11px] text-ink" : "text-xs text-ink"}>
        {value}
      </dd>
    </div>
  );
}
