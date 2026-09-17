import "server-only";

import type { Listener } from "@/lib/session";

import { getWorkspace } from "./store";
import type { WorkspaceItem, WorkspaceModel, WorkspaceRating, WorkspaceSample } from "./types";

/** One published collection, summarised for the member-facing folder list. */
export interface MemberCollectionSummary {
  id: string;
  name: string;
  language: string;
  languageNative: string | null;
  task: string;
  description: string;
  modelCount: number;
  itemCount: number;
  /** Cells that actually have a generated clip — the number a member can rate. */
  ratableCells: number;
  /** This listener's own completed cells, when a listener is given. */
  myDone: number;
}

/** Only folders that are published *and* have at least one uploaded clip. */
export async function listMemberCollections(
  listener: Listener | null,
): Promise<MemberCollectionSummary[]> {
  const snapshot = await getWorkspace();

  return snapshot.collections
    .filter((collection) => collection.status === "published")
    .map((collection) => {
      const models = snapshot.models.filter((m) => m.collectionId === collection.id);
      const items = snapshot.items.filter((i) => i.collectionId === collection.id);
      const generated = snapshot.samples.filter(
        (s) => s.collectionId === collection.id && s.role === "generated",
      );
      const myRatings = listener
        ? snapshot.ratings.filter(
            (r) => r.collectionId === collection.id && r.participantId === listener.id,
          )
        : [];

      return {
        id: collection.id,
        name: collection.name,
        language: collection.language,
        languageNative: collection.languageNative,
        task: collection.task,
        description: collection.description,
        modelCount: models.length,
        itemCount: items.length,
        ratableCells: generated.length,
        myDone: myRatings.filter((r) => r.naturalness !== null || r.similarity !== null).length,
      };
    })
    .filter((collection) => collection.ratableCells > 0);
}

export interface MemberCollectionCell {
  model: WorkspaceModel;
  sample: WorkspaceSample | null;
  rating: WorkspaceRating | null;
}

export interface MemberCollectionRow {
  item: WorkspaceItem;
  source: WorkspaceSample | null;
  target: WorkspaceSample | null;
  cells: MemberCollectionCell[];
}

export interface MemberCollectionDetail {
  id: string;
  name: string;
  language: string;
  languageNative: string | null;
  task: string;
  description: string;
  models: WorkspaceModel[];
  rows: MemberCollectionRow[];
}

/**
 * A published collection's full matrix, merged with one listener's own
 * ratings, so the rating page can server-render its initial state without a
 * hydration flash. Returns undefined for a draft or unknown collection — a
 * member has no reason to see either.
 */
export async function getMemberCollection(
  id: string,
  listener: Listener | null,
): Promise<MemberCollectionDetail | undefined> {
  const snapshot = await getWorkspace();
  const collection = snapshot.collections.find((c) => c.id === id && c.status === "published");
  if (!collection) return undefined;

  const models = snapshot.models
    .filter((m) => m.collectionId === id)
    .sort((a, b) => a.order - b.order);
  const items = snapshot.items
    .filter((i) => i.collectionId === id)
    .sort((a, b) => a.order - b.order);
  const samples = snapshot.samples.filter((s) => s.collectionId === id);
  const myRatings = listener
    ? snapshot.ratings.filter((r) => r.collectionId === id && r.participantId === listener.id)
    : [];

  const rows: MemberCollectionRow[] = items.map((item) => ({
    item,
    source: samples.find((s) => s.id === item.sourceSampleId) ?? null,
    target: samples.find((s) => s.id === item.targetSampleId) ?? null,
    cells: models.map((model) => ({
      model,
      sample:
        samples.find(
          (s) => s.itemId === item.id && s.modelId === model.id && s.role === "generated",
        ) ?? null,
      rating: myRatings.find((r) => r.itemId === item.id && r.modelId === model.id) ?? null,
    })),
  }));

  return {
    id: collection.id,
    name: collection.name,
    language: collection.language,
    languageNative: collection.languageNative,
    task: collection.task,
    description: collection.description,
    models,
    rows,
  };
}
