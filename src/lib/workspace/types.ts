/**
 * The management side's own data: benchmarks an administrator creates, the
 * models they compare inside one, the utterances they compare across, and the
 * audio attached to each cell.
 *
 * A collection is a matrix. Rows are items (one utterance), columns are models,
 * and a sample is what sits in a cell.
 */

export interface WorkspaceCollection {
  id: string;
  name: string;
  language: string;
  /** Native-script name, when the language has one. */
  languageNative: string | null;
  task: string;
  description: string;
  /** Draft collections are hidden from members. */
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceModel {
  id: string;
  collectionId: string;
  name: string;
  version: string;
  notes: string | null;
  /** Column position, left to right. */
  order: number;
  createdAt: string;
}

/** A row: one utterance every model is asked to produce. */
export interface WorkspaceItem {
  id: string;
  collectionId: string;
  label: string;
  transcript: string | null;
  /** The shared reference clips for this row, if uploaded. */
  sourceSampleId: string | null;
  targetSampleId: string | null;
  order: number;
  createdAt: string;
}

export interface WorkspaceSample {
  id: string;
  collectionId: string;
  /** Null for the row's own source/target reference clips. */
  modelId: string | null;
  itemId: string;
  role: "source" | "target" | "generated";
  /** Storage key, never a path the browser sees. */
  objectKey: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  durationSec: number | null;
  sampleRate: number | null;
  createdAt: string;
}

/** A member's score for one cell (item × model). */
export interface WorkspaceRating {
  id: string;
  collectionId: string;
  itemId: string;
  modelId: string;
  participantId: string;
  participantName: string;
  naturalness: number | null;
  similarity: number | null;
  note: string | null;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  collections: WorkspaceCollection[];
  models: WorkspaceModel[];
  items: WorkspaceItem[];
  samples: WorkspaceSample[];
  ratings: WorkspaceRating[];
}

export const EMPTY_WORKSPACE: WorkspaceSnapshot = {
  collections: [],
  models: [],
  items: [],
  samples: [],
  ratings: [],
};
