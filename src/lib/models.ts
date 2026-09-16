import "server-only";

import { getBundle } from "./bundle";
import type { Clip, ModelInfo, Pair } from "./types";

export interface ModelSample {
  pair: Pair;
  clip: Clip;
  /** Length difference against this pair's source clip, in seconds. */
  drift: number;
}

export interface ModelOverview extends ModelInfo {
  sampleCount: number;
  totalSeconds: number;
  totalBytes: number;
  meanDurationSec: number;
  /** Mean absolute length drift against the source clips. */
  meanAbsDrift: number;
  /** Clips the bundle resampled to 16 kHz. */
  resampledCount: number;
  pairsCovered: number;
}

function summarise(model: ModelInfo, samples: ModelSample[]): ModelOverview {
  const totalSeconds = samples.reduce((sum, entry) => sum + entry.clip.durationSeconds, 0);
  const totalDrift = samples.reduce((sum, entry) => sum + Math.abs(entry.drift), 0);

  return {
    ...model,
    sampleCount: samples.length,
    totalSeconds,
    totalBytes: samples.reduce((sum, entry) => sum + entry.clip.bytes, 0),
    meanDurationSec: samples.length ? totalSeconds / samples.length : 0,
    meanAbsDrift: samples.length ? totalDrift / samples.length : 0,
    resampledCount: samples.filter((entry) => entry.clip.resampled).length,
    pairsCovered: new Set(samples.map((entry) => entry.pair.slug)).size,
  };
}

/** Every generated clip belonging to one model, one per pair. */
export async function getModelSamples(modelKey: string): Promise<ModelSample[]> {
  const { pairs } = await getBundle();
  return pairs.flatMap((pair) => {
    const clip = pair.models.find((candidate) => candidate.key === modelKey);
    if (!clip) return [];
    return [{ pair, clip, drift: clip.durationSeconds - pair.source.durationSeconds }];
  });
}

export async function listModels(): Promise<ModelOverview[]> {
  const { models } = await getBundle();
  return Promise.all(
    models.map(async (model) =>
      summarise(model, await getModelSamples(model.key)),
    ),
  );
}

export async function getModel(
  modelKey: string,
): Promise<{ model: ModelOverview; samples: ModelSample[] } | undefined> {
  const { models } = await getBundle();
  const model = models.find((candidate) => candidate.key === modelKey);
  if (!model) return undefined;

  const samples = await getModelSamples(modelKey);
  return { model: summarise(model, samples), samples };
}

/** Flat view of all 120 clips, for the samples table. */
export interface SampleRow {
  id: string;
  pairName: string;
  pairSlug: string;
  role: Clip["role"];
  modelKey: string;
  modelLabel: string;
  durationSeconds: number;
  sampleRate: number;
  bytes: number;
  sha256: string;
  resampled: boolean;
  subtype: string | null;
  src: string;
  path: string;
  sourceCorpus: string;
  targetCorpus: string;
  speaker: string;
}

export async function listSamples(): Promise<SampleRow[]> {
  const { pairs } = await getBundle();

  return pairs.flatMap((pair) =>
    [pair.source, pair.target, ...pair.models].map((clip) => ({
      id: clip.id,
      pairName: pair.name,
      pairSlug: pair.slug,
      role: clip.role,
      modelKey: clip.key,
      modelLabel: clip.label,
      durationSeconds: clip.durationSeconds,
      sampleRate: clip.sampleRate,
      bytes: clip.bytes,
      sha256: clip.sha256,
      resampled: clip.resampled,
      subtype: clip.subtype,
      src: clip.src,
      path: clip.path,
      sourceCorpus: pair.sourceCorpus,
      targetCorpus: pair.targetCorpus,
      speaker: pair.targetSpeaker,
    })),
  );
}
