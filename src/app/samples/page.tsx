import type { Metadata } from "next";

import { SampleTable } from "@/components/SampleTable";
import { SectionHeading, StatTile } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { listSamples } from "@/lib/models";

export const metadata: Metadata = {
  title: "Samples",
  description: "Every clip in the bundle, searchable and playable.",
};

export default async function SamplesPage() {
  const samples = await listSamples();
  const models = samples.filter((sample) => sample.role === "model").length;
  const references = samples.length - models;
  const totalSeconds = samples.reduce((sum, sample) => sum + sample.durationSeconds, 0);

  return (
    <div className="space-y-7">
      <SectionHeading
        title="Samples"
        description="Every clip the studio can play, with its checksum and provenance. Filter, sort, listen inline, or open the pair it belongs to."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Clips" value={samples.length} hint={formatBytes(samples.reduce((sum, s) => sum + s.bytes, 0))} />
        <StatTile label="Generated" value={models} hint="model outputs" />
        <StatTile label="References" value={references} hint="source and target" />
        <StatTile
          label="Total length"
          value={`${Math.round(totalSeconds / 60)} min`}
          hint={`${Math.round(totalSeconds)} seconds`}
        />
      </div>

      <SampleTable samples={samples} />
    </div>
  );
}
