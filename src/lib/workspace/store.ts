import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  EMPTY_WORKSPACE,
  type WorkspaceCollection,
  type WorkspaceItem,
  type WorkspaceModel,
  type WorkspaceRating,
  type WorkspaceSample,
  type WorkspaceSnapshot,
} from "./types";

/**
 * JSON-file workspace store, with audio written beside it.
 *
 * Same trade-off as the submission store: no setup, durable on a normal disk,
 * and per-instance on a serverless host — which is why `workspaceLocation()`
 * reports where it landed so the UI can say so plainly.
 */

function serverless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function root(): string {
  const configured = process.env.WORKSPACE_DIR?.trim();
  if (configured) return path.resolve(configured);
  if (serverless()) return path.join(tmpdir(), "ses-workspace");
  return path.resolve(process.cwd(), ".data", "workspace");
}

function metadataFile(): string {
  return path.join(root(), "workspace.json");
}

function audioDir(): string {
  return path.join(root(), "audio");
}

export function workspaceLocation(): { dir: string; ephemeral: boolean } {
  return { dir: root(), ephemeral: serverless() && !process.env.WORKSPACE_DIR?.trim() };
}

// Every write rewrites the whole file, so they are chained rather than raced.
let queue: Promise<unknown> = Promise.resolve();

function serialise<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function read(): Promise<WorkspaceSnapshot> {
  try {
    const raw = await readFile(metadataFile(), "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    return {
      collections: parsed.collections ?? [],
      models: parsed.models ?? [],
      items: parsed.items ?? [],
      samples: parsed.samples ?? [],
      ratings: parsed.ratings ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY_WORKSPACE };
    throw error;
  }
}

async function write(snapshot: WorkspaceSnapshot): Promise<void> {
  await mkdir(root(), { recursive: true });
  const temporary = `${metadataFile()}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot, null, 2), "utf8");
  await rename(temporary, metadataFile());
}

async function mutate<T>(change: (snapshot: WorkspaceSnapshot) => T): Promise<T> {
  return serialise(async () => {
    const snapshot = await read();
    const result = change(snapshot);
    await write(snapshot);
    return result;
  });
}

export function getWorkspace(): Promise<WorkspaceSnapshot> {
  return serialise(read);
}

// ------------------------------------------------------------- collections --

export function createCollection(input: {
  name: string;
  language: string;
  languageNative?: string;
  task: string;
  description: string;
}): Promise<WorkspaceCollection> {
  const now = new Date().toISOString();
  const collection: WorkspaceCollection = {
    id: `col_${randomUUID()}`,
    name: input.name,
    language: input.language,
    languageNative: input.languageNative?.trim() || null,
    task: input.task,
    description: input.description,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  return mutate((snapshot) => {
    snapshot.collections.push(collection);
    return collection;
  });
}

export function updateCollection(
  id: string,
  patch: Partial<Pick<WorkspaceCollection, "name" | "language" | "languageNative" | "task" | "description" | "status">>,
): Promise<WorkspaceCollection | undefined> {
  return mutate((snapshot) => {
    const collection = snapshot.collections.find((entry) => entry.id === id);
    if (!collection) return undefined;
    Object.assign(collection, patch, { updatedAt: new Date().toISOString() });
    return collection;
  });
}

/** Removes the collection and everything hanging off it. */
export async function deleteCollection(id: string): Promise<string[]> {
  const removedKeys = await mutate((snapshot) => {
    const keys = snapshot.samples
      .filter((sample) => sample.collectionId === id)
      .map((sample) => sample.objectKey);

    snapshot.collections = snapshot.collections.filter((entry) => entry.id !== id);
    snapshot.models = snapshot.models.filter((entry) => entry.collectionId !== id);
    snapshot.items = snapshot.items.filter((entry) => entry.collectionId !== id);
    snapshot.samples = snapshot.samples.filter((entry) => entry.collectionId !== id);
    snapshot.ratings = snapshot.ratings.filter((entry) => entry.collectionId !== id);
    return keys;
  });

  await Promise.all(removedKeys.map((key) => removeAudio(key)));
  return removedKeys;
}

// ----------------------------------------------------------------- models --

export function addModel(input: {
  collectionId: string;
  name: string;
  version: string;
  notes?: string;
}): Promise<WorkspaceModel> {
  return mutate((snapshot) => {
    const siblings = snapshot.models.filter((entry) => entry.collectionId === input.collectionId);
    const model: WorkspaceModel = {
      id: `mdl_${randomUUID()}`,
      collectionId: input.collectionId,
      name: input.name,
      version: input.version,
      notes: input.notes?.trim() || null,
      order: siblings.length,
      createdAt: new Date().toISOString(),
    };
    snapshot.models.push(model);
    return model;
  });
}

export async function deleteModel(id: string): Promise<void> {
  const removedKeys = await mutate((snapshot) => {
    const keys = snapshot.samples
      .filter((sample) => sample.modelId === id)
      .map((sample) => sample.objectKey);
    snapshot.models = snapshot.models.filter((entry) => entry.id !== id);
    snapshot.samples = snapshot.samples.filter((entry) => entry.modelId !== id);
    snapshot.ratings = snapshot.ratings.filter((entry) => entry.modelId !== id);
    return keys;
  });
  await Promise.all(removedKeys.map((key) => removeAudio(key)));
}

// ------------------------------------------------------------------ items --

export function addItem(input: {
  collectionId: string;
  label: string;
  transcript?: string;
}): Promise<WorkspaceItem> {
  return mutate((snapshot) => {
    const siblings = snapshot.items.filter((entry) => entry.collectionId === input.collectionId);
    const item: WorkspaceItem = {
      id: `itm_${randomUUID()}`,
      collectionId: input.collectionId,
      label: input.label,
      transcript: input.transcript?.trim() || null,
      sourceSampleId: null,
      targetSampleId: null,
      order: siblings.length,
      createdAt: new Date().toISOString(),
    };
    snapshot.items.push(item);
    return item;
  });
}

export async function deleteItem(id: string): Promise<void> {
  const removedKeys = await mutate((snapshot) => {
    const keys = snapshot.samples
      .filter((sample) => sample.itemId === id)
      .map((sample) => sample.objectKey);
    snapshot.items = snapshot.items.filter((entry) => entry.id !== id);
    snapshot.samples = snapshot.samples.filter((entry) => entry.itemId !== id);
    snapshot.ratings = snapshot.ratings.filter((entry) => entry.itemId !== id);
    return keys;
  });
  await Promise.all(removedKeys.map((key) => removeAudio(key)));
}

// ---------------------------------------------------------------- samples --

export async function putAudio(bytes: Buffer, extension: string): Promise<string> {
  // Content-addressed by the caller's checksum; the key is never user input.
  const key = `${randomUUID()}${extension}`;
  await mkdir(audioDir(), { recursive: true });
  await writeFile(path.join(audioDir(), key), bytes);
  return key;
}

export function audioPath(objectKey: string): string | null {
  // Reject anything that is not a bare generated key.
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i.test(objectKey)) return null;
  return path.join(audioDir(), objectKey);
}

async function removeAudio(objectKey: string): Promise<void> {
  const file = audioPath(objectKey);
  if (!file) return;
  await unlink(file).catch(() => undefined);
}

export async function attachSample(input: {
  collectionId: string;
  modelId: string | null;
  itemId: string;
  role: WorkspaceSample["role"];
  objectKey: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  durationSec: number | null;
  sampleRate: number | null;
}): Promise<WorkspaceSample> {
  const sample: WorkspaceSample = {
    id: `smp_${randomUUID()}`,
    ...input,
    createdAt: new Date().toISOString(),
  };

  const replaced = await mutate((snapshot) => {
    // One sample per cell: a re-upload replaces what was there.
    const previous = snapshot.samples.find(
      (entry) =>
        entry.itemId === input.itemId &&
        entry.modelId === input.modelId &&
        entry.role === input.role,
    );
    if (previous) {
      snapshot.samples = snapshot.samples.filter((entry) => entry.id !== previous.id);
    }
    snapshot.samples.push(sample);

    if (input.role !== "generated") {
      const item = snapshot.items.find((entry) => entry.id === input.itemId);
      if (item) {
        if (input.role === "source") item.sourceSampleId = sample.id;
        else item.targetSampleId = sample.id;
      }
    }

    return previous?.objectKey ?? null;
  });

  if (replaced) await removeAudio(replaced);
  return sample;
}

export async function deleteSample(id: string): Promise<void> {
  const key = await mutate((snapshot) => {
    const sample = snapshot.samples.find((entry) => entry.id === id);
    if (!sample) return null;
    snapshot.samples = snapshot.samples.filter((entry) => entry.id !== id);
    for (const item of snapshot.items) {
      if (item.sourceSampleId === id) item.sourceSampleId = null;
      if (item.targetSampleId === id) item.targetSampleId = null;
    }
    return sample.objectKey;
  });
  if (key) await removeAudio(key);
}

export async function findSample(id: string): Promise<WorkspaceSample | undefined> {
  const snapshot = await getWorkspace();
  return snapshot.samples.find((entry) => entry.id === id);
}

// ---------------------------------------------------------------- ratings --

/** Upserts one member's score for one cell — unique on (itemId, modelId, participantId). */
export function rateWorkspaceSample(input: {
  collectionId: string;
  itemId: string;
  modelId: string;
  participantId: string;
  participantName: string;
  naturalness: number | null;
  similarity: number | null;
  note: string | null;
}): Promise<WorkspaceRating> {
  return mutate((snapshot) => {
    const existing = snapshot.ratings.find(
      (entry) =>
        entry.itemId === input.itemId &&
        entry.modelId === input.modelId &&
        entry.participantId === input.participantId,
    );

    const rating: WorkspaceRating = {
      id: existing?.id ?? `wrt_${randomUUID()}`,
      collectionId: input.collectionId,
      itemId: input.itemId,
      modelId: input.modelId,
      participantId: input.participantId,
      participantName: input.participantName,
      naturalness: input.naturalness,
      similarity: input.similarity,
      note: input.note,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      snapshot.ratings = snapshot.ratings.map((entry) => (entry.id === existing.id ? rating : entry));
    } else {
      snapshot.ratings.push(rating);
    }

    return rating;
  });
}
