import type { Metadata } from "next";

import { ClipTable } from "@/components/ClipTable";
import { SectionHeading, StatTile } from "@/components/ui";
import { getBundle } from "@/lib/bundle";
import { formatBytes } from "@/lib/format";

export const metadata: Metadata = {
  title: "Bundle data",
  description: "Provenance for every clip in the 16 kHz portable listening bundle.",
};

export default async function DataPage() {
  const { pairs, stats, meta } = await getBundle();

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Bundle data"
        description="Read straight from the bundle on disk at render time. Nothing here is copied into the app or re-encoded."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Clips" value={stats.clips} hint={formatBytes(stats.totalBytes)} />
        <StatTile
          label="Audio length"
          value={`${Math.round(stats.totalSeconds / 60)} min`}
          hint={`${Math.round(stats.totalSeconds)} seconds total`}
        />
        <StatTile
          label="Resampled"
          value={stats.resampledClips}
          hint="written as float32 WAV"
        />
        <StatTile
          label="Untouched"
          value={stats.preservedClips}
          hint="already 16 kHz, byte-for-byte"
        />
      </div>

      <dl className="panel grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
        <Entry label="Bundle directory" value={meta.bundleDir} mono />
        <Entry label="Manifest" value={meta.manifest} mono />
        <Entry label="Manifest sha256" value={meta.manifestSha256} mono />
        {meta.originalManifestSha256 ? (
          <Entry label="Original manifest sha256" value={meta.originalManifestSha256} mono />
        ) : null}
        <Entry label="Target resolution" value={meta.targetResolution} />
        <Entry label="Sample rate" value={`${meta.audioProcessing.sample_rate_hz} Hz`} />
        <Entry label="Resampling method" value={meta.audioProcessing.method} />
        <Entry
          label="Normalisation"
          value={meta.audioProcessing.normalization ? "applied" : "none — levels are as produced"}
        />
        <Entry label="Clips already at 16 kHz" value={meta.audioProcessing.already_16khz} />
      </dl>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Every clip
        </h2>
        <ClipTable pairs={pairs} />
      </section>
    </div>
  );
}

function Entry({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-faint">{label}</dt>
      <dd
        className={
          mono
            ? "mt-0.5 break-all font-mono text-[11px] text-ink"
            : "mt-0.5 text-sm leading-relaxed text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}
