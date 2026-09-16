import type { BlindTrialResult, Rating } from "@/store/ratings";

export interface ModelSummary {
  modelKey: string;
  modelLabel: string;
  naturalness: number | null;
  similarity: number | null;
  overall: number | null;
  count: number;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Aggregates open (labelled) ratings keyed by pair → model. */
export function summariseRatings(
  ratings: Record<string, Record<string, Rating>>,
  modelLabel: (key: string) => string,
): ModelSummary[] {
  const naturalness = new Map<string, number[]>();
  const similarity = new Map<string, number[]>();

  for (const models of Object.values(ratings)) {
    for (const [modelKey, rating] of Object.entries(models)) {
      if (rating.naturalness !== undefined) {
        push(naturalness, modelKey, rating.naturalness);
      }
      if (rating.similarity !== undefined) {
        push(similarity, modelKey, rating.similarity);
      }
    }
  }

  return toSummaries(naturalness, similarity, modelLabel);
}

interface FlatRating {
  modelKey: string;
  naturalness: number | null;
  similarity: number | null;
}

/** Aggregates the flat rows the server stores, across every participant. */
export function summariseRecords(
  records: FlatRating[],
  modelLabel: (key: string) => string,
): ModelSummary[] {
  const naturalness = new Map<string, number[]>();
  const similarity = new Map<string, number[]>();

  for (const record of records) {
    if (record.naturalness !== null) push(naturalness, record.modelKey, record.naturalness);
    if (record.similarity !== null) push(similarity, record.modelKey, record.similarity);
  }

  return toSummaries(naturalness, similarity, modelLabel);
}

/** Aggregates blind-test trials, which always carry both scores. */
export function summariseBlind(trials: BlindTrialResult[]): ModelSummary[] {
  const naturalness = new Map<string, number[]>();
  const similarity = new Map<string, number[]>();
  const labels = new Map<string, string>();

  for (const trial of trials) {
    push(naturalness, trial.modelKey, trial.naturalness);
    push(similarity, trial.modelKey, trial.similarity);
    labels.set(trial.modelKey, trial.modelLabel);
  }

  return toSummaries(naturalness, similarity, (key) => labels.get(key) ?? key);
}

function push(target: Map<string, number[]>, key: string, value: number): void {
  const existing = target.get(key);
  if (existing) existing.push(value);
  else target.set(key, [value]);
}

function toSummaries(
  naturalness: Map<string, number[]>,
  similarity: Map<string, number[]>,
  modelLabel: (key: string) => string,
): ModelSummary[] {
  const keys = new Set([...naturalness.keys(), ...similarity.keys()]);

  return [...keys]
    .map((modelKey) => {
      const natural = mean(naturalness.get(modelKey) ?? []);
      const similar = mean(similarity.get(modelKey) ?? []);
      const parts = [natural, similar].filter((value): value is number => value !== null);
      return {
        modelKey,
        modelLabel: modelLabel(modelKey),
        naturalness: natural,
        similarity: similar,
        overall: parts.length ? parts.reduce((sum, value) => sum + value, 0) / parts.length : null,
        count: Math.max(
          naturalness.get(modelKey)?.length ?? 0,
          similarity.get(modelKey)?.length ?? 0,
        ),
      };
    })
    .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
}

export function downloadFile(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
