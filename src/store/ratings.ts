"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Rating {
  /** How natural / artefact-free the clip sounds, 1–5. */
  naturalness?: number;
  /** How close the voice is to the target speaker, 1–5. */
  similarity?: number;
  note?: string;
  updatedAt: number;
}

export type RatingField = "naturalness" | "similarity";

export interface BlindTrialResult {
  pairSlug: string;
  pairName: string;
  modelKey: string;
  modelLabel: string;
  naturalness: number;
  similarity: number;
  answeredAt: number;
}

/** One row as the server stores it. */
export interface ServerRating {
  pairSlug: string;
  modelKey: string;
  naturalness: number | null;
  similarity: number | null;
  note: string | null;
  updatedAt: string;
}

/**
 * Mirrors a score to the server so it counts towards everyone's results. The
 * local store stays the source of truth for the UI: a failed request (offline,
 * signed out) leaves the score in this browser and it is sent again on the next
 * edit, so nothing is ever lost mid-session.
 */
function pushToServer(pairSlug: string, modelKey: string, rating: Rating): void {
  if (typeof window === "undefined") return;
  void fetch("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairSlug,
      modelKey,
      naturalness: rating.naturalness ?? null,
      similarity: rating.similarity ?? null,
      note: rating.note ?? null,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

interface RatingsState {
  /** `pairSlug` → `modelKey` → rating. */
  ratings: Record<string, Record<string, Rating>>;
  blind: BlindTrialResult[];
  rate: (pairSlug: string, modelKey: string, field: RatingField, value: number) => void;
  setNote: (pairSlug: string, modelKey: string, note: string) => void;
  mergeFromServer: (rows: ServerRating[]) => void;
  clearPair: (pairSlug: string) => void;
  clearAll: () => void;
  recordBlind: (result: BlindTrialResult) => void;
  clearBlind: () => void;
}

export const useRatingsStore = create<RatingsState>()(
  persist(
    (set) => ({
      ratings: {},
      blind: [],
      rate: (pairSlug, modelKey, field, value) =>
        set((state) => {
          const forPair = state.ratings[pairSlug] ?? {};
          const current = forPair[modelKey];
          // Clicking the selected star again clears that score.
          const next = current?.[field] === value ? undefined : value;
          const updated: Rating = { ...current, [field]: next, updatedAt: Date.now() };
          pushToServer(pairSlug, modelKey, updated);
          return {
            ratings: { ...state.ratings, [pairSlug]: { ...forPair, [modelKey]: updated } },
          };
        }),
      setNote: (pairSlug, modelKey, note) =>
        set((state) => {
          const forPair = state.ratings[pairSlug] ?? {};
          const updated: Rating = { ...forPair[modelKey], note, updatedAt: Date.now() };
          pushToServer(pairSlug, modelKey, updated);
          return {
            ratings: { ...state.ratings, [pairSlug]: { ...forPair, [modelKey]: updated } },
          };
        }),
      mergeFromServer: (rows) =>
        set((state) => {
          const ratings = { ...state.ratings };
          for (const row of rows) {
            const forPair = { ...(ratings[row.pairSlug] ?? {}) };
            const local = forPair[row.modelKey];
            const remoteAt = Date.parse(row.updatedAt);
            // The local copy wins only while it is the more recent edit.
            if (local && local.updatedAt >= remoteAt) continue;
            forPair[row.modelKey] = {
              naturalness: row.naturalness ?? undefined,
              similarity: row.similarity ?? undefined,
              note: row.note ?? undefined,
              updatedAt: Number.isNaN(remoteAt) ? Date.now() : remoteAt,
            };
            ratings[row.pairSlug] = forPair;
          }
          return { ratings };
        }),
      clearPair: (pairSlug) =>
        set((state) => {
          const next = { ...state.ratings };
          delete next[pairSlug];
          return { ratings: next };
        }),
      clearAll: () => set({ ratings: {} }),
      recordBlind: (result) => set((state) => ({ blind: [...state.blind, result] })),
      clearBlind: () => set({ blind: [] }),
    }),
    {
      name: "vc-listening-studio.ratings",
      version: 1,
    },
  ),
);

/** Counts scored models for a pair, for the progress dots in the pair nav. */
export function ratedCount(ratings: Record<string, Rating> | undefined): number {
  if (!ratings) return 0;
  return Object.values(ratings).filter(
    (rating) => rating.naturalness !== undefined || rating.similarity !== undefined,
  ).length;
}

export function toCsv(
  ratings: RatingsState["ratings"],
  blind: BlindTrialResult[],
  labels: { pairName: (slug: string) => string; modelLabel: (key: string) => string },
): string {
  const rows: string[][] = [
    ["mode", "pair", "model", "naturalness", "similarity", "note", "updated_at"],
  ];

  for (const [pairSlug, models] of Object.entries(ratings)) {
    for (const [modelKey, rating] of Object.entries(models)) {
      if (rating.naturalness === undefined && rating.similarity === undefined && !rating.note) {
        continue;
      }
      rows.push([
        "open",
        labels.pairName(pairSlug),
        labels.modelLabel(modelKey),
        rating.naturalness?.toString() ?? "",
        rating.similarity?.toString() ?? "",
        rating.note ?? "",
        new Date(rating.updatedAt).toISOString(),
      ]);
    }
  }

  for (const trial of blind) {
    rows.push([
      "blind",
      trial.pairName,
      trial.modelLabel,
      trial.naturalness.toString(),
      trial.similarity.toString(),
      "",
      new Date(trial.answeredAt).toISOString(),
    ]);
  }

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
