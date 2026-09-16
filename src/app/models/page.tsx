import type { Metadata } from "next";

import { requireResearcher } from "@/lib/guard";
import Link from "next/link";

import { MiniWave } from "@/components/landing/MiniWave";
import { SectionHeading, StatTile } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { listModels } from "@/lib/models";
import { accentFor } from "@/lib/palette";

export const metadata: Metadata = {
  title: "Models",
  description: "Every model in the bundle, with its samples and length behaviour.",
};

// Reads the session to keep members out, so it cannot be prerendered.
export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  await requireResearcher();
  const models = await listModels();
  const totalClips = models.reduce((sum, model) => sum + model.sampleCount, 0);
  const totalSeconds = models.reduce((sum, model) => sum + model.totalSeconds, 0);
  const families = new Set(models.map((model) => model.family)).size;

  return (
    <div className="space-y-7">
      <SectionHeading
        title="Models"
        description="Ten systems, each with one converted clip per pair. Length drift is the mean absolute difference against the source clip — large drift usually means the content itself moved, not just the voice."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Models" value={models.length} hint={`${families} families`} />
        <StatTile label="Generated clips" value={totalClips} hint="one per pair, per model" />
        <StatTile
          label="Audio"
          value={`${Math.round(totalSeconds / 60)} min`}
          hint={formatBytes(models.reduce((sum, model) => sum + model.totalBytes, 0))}
        />
        <StatTile
          label="Resampled"
          value={models.reduce((sum, model) => sum + model.resampledCount, 0)}
          hint="written as float32 WAV"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {models.map((model) => {
          const accent = accentFor(model.family, model.order);
          const heavyDrift = model.meanAbsDrift > 0.5;

          return (
            <Link
              key={model.key}
              href={`/models/${model.key}`}
              className="panel lift group flex flex-col rounded-2xl p-4"
              style={{ borderTopColor: accent, borderTopWidth: 3 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">
                    {model.label}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-faint">{model.family} family</p>
                </div>
                <kbd className="tnum shrink-0 rounded-md border border-line-strong bg-sunken px-1.5 py-px font-mono text-[10px] text-faint">
                  {(model.order + 1) % 10}
                </kbd>
              </div>

              <MiniWave
                seed={model.key}
                color={accent}
                bars={30}
                className="mt-3 h-7 w-full opacity-75 transition-opacity group-hover:opacity-100"
              />

              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-[11px]">
                <div>
                  <dt className="text-faint">Samples</dt>
                  <dd className="tnum mt-0.5 font-semibold text-ink">{model.sampleCount}</dd>
                </div>
                <div>
                  <dt className="text-faint">Mean length</dt>
                  <dd className="tnum mt-0.5 font-semibold text-ink">
                    {model.meanDurationSec.toFixed(1)}s
                  </dd>
                </div>
                <div>
                  <dt className="text-faint">Drift</dt>
                  <dd
                    className="tnum mt-0.5 font-semibold"
                    style={{ color: heavyDrift ? "var(--amber)" : "var(--text)" }}
                    title="Mean absolute length difference against the source clips"
                  >
                    ±{model.meanAbsDrift.toFixed(2)}s
                  </dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
