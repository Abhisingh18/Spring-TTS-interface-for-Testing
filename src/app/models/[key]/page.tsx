import type { Metadata } from "next";

import { requireResearcher } from "@/lib/guard";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModelSampleList } from "@/components/ModelSampleList";
import { Badge, StatTile } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { getModel } from "@/lib/models";
import { accentFor } from "@/lib/palette";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const found = await getModel(key);
  return { title: found ? found.model.label : "Model not found" };
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireResearcher();
  const { key } = await params;
  const found = await getModel(key);
  if (!found) notFound();

  const { model, samples } = found;
  const accent = accentFor(model.family, model.order);
  const longest = samples.reduce(
    (best, entry) => (Math.abs(entry.drift) > Math.abs(best.drift) ? entry : best),
    samples[0]!,
  );

  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/models"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> All models
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: accent }}
            aria-hidden="true"
          />
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{model.label}</h1>
          <Badge tone="accent">{model.family}</Badge>
          <span className="tnum font-mono text-xs text-faint">
            keyboard {(model.order + 1) % 10}
          </span>
        </div>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          One converted clip per pair — the model tries to say each pair&rsquo;s source words in
          that pair&rsquo;s target voice. Compare against the references inline below.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Samples"
          value={model.sampleCount}
          hint={`across ${model.pairsCovered} pairs`}
        />
        <StatTile
          label="Audio"
          value={`${model.totalSeconds.toFixed(1)}s`}
          hint={formatBytes(model.totalBytes)}
        />
        <StatTile
          label="Mean length"
          value={`${model.meanDurationSec.toFixed(2)}s`}
          hint={`±${model.meanAbsDrift.toFixed(2)}s vs source`}
        />
        <StatTile
          label="Resampled"
          value={`${model.resampledCount}/${model.sampleCount}`}
          hint={model.resampledCount === 0 ? "all byte-for-byte" : "float32 WAV"}
        />
      </div>

      {longest && Math.abs(longest.drift) > 0.5 ? (
        <p className="panel rounded-2xl border-amber/40 px-4 py-3 text-sm text-muted">
          <span className="font-medium text-amber">Largest drift · </span>
          {longest.pair.name} runs {longest.drift > 0 ? "longer" : "shorter"} than its source by{" "}
          <span className="tnum font-medium text-ink">{Math.abs(longest.drift).toFixed(2)}s</span>.
          Worth listening to first — that much movement usually means content changed.
        </p>
      ) : null}

      <ModelSampleList
        samples={samples.map((entry) => ({
          pairName: entry.pair.name,
          pairSlug: entry.pair.slug,
          pairIndex: entry.pair.index,
          sourceCorpus: entry.pair.sourceCorpus,
          targetCorpus: entry.pair.targetCorpus,
          sourceText: entry.pair.sourceText,
          drift: entry.drift,
          clip: entry.clip,
          source: entry.pair.source,
          target: entry.pair.target,
        }))}
        accent={accent}
        modelKey={model.key}
      />
    </div>
  );
}
