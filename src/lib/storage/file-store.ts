import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Snapshot, Store } from "./types";

/**
 * JSON-file store. This is the default driver: it needs no setup and keeps every
 * submission on the same drive as the rest of the project.
 *
 * Serverless hosts have a read-only (and ephemeral) filesystem, so on Vercel you
 * want the Postgres driver instead — see src/lib/storage/index.ts.
 */
export function createFileStore(file: string): Store {
  // Every write reads, mutates and rewrites the whole file, so the operations
  // are chained rather than run concurrently.
  let queue: Promise<unknown> = Promise.resolve();

  function serialise<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function read(): Promise<Snapshot> {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<Snapshot>;
      return {
        participants: parsed.participants ?? [],
        ratings: parsed.ratings ?? [],
        feedback: parsed.feedback ?? [],
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return { participants: [], ratings: [], feedback: [] };
      throw error;
    }
  }

  async function write(snapshot: Snapshot): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    // Write beside the target and rename, so a crash cannot truncate the store.
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(snapshot, null, 2), "utf8");
    await rename(temporary, file);
  }

  async function mutate(change: (snapshot: Snapshot) => void): Promise<void> {
    return serialise(async () => {
      const snapshot = await read();
      change(snapshot);
      await write(snapshot);
    });
  }

  return {
    kind: "file",

    upsertParticipant: (participant) =>
      mutate((snapshot) => {
        const existing = snapshot.participants.find((row) => row.id === participant.id);
        if (existing) {
          existing.name = participant.name;
          existing.lastSeenAt = participant.lastSeenAt;
        } else {
          snapshot.participants.push(participant);
        }
      }),

    saveRating: (rating) =>
      mutate((snapshot) => {
        const index = snapshot.ratings.findIndex(
          (row) =>
            row.participantId === rating.participantId &&
            row.pairSlug === rating.pairSlug &&
            row.modelKey === rating.modelKey,
        );
        if (index === -1) snapshot.ratings.push(rating);
        else snapshot.ratings[index] = rating;
      }),

    saveFeedback: (feedback) =>
      mutate((snapshot) => {
        const index = snapshot.feedback.findIndex(
          (row) => row.participantId === feedback.participantId,
        );
        if (index === -1) snapshot.feedback.push(feedback);
        else snapshot.feedback[index] = feedback;
      }),

    ratingsFor: async (participantId) => {
      const snapshot = await serialise(read);
      return snapshot.ratings.filter((row) => row.participantId === participantId);
    },

    snapshot: () => serialise(read),
  };
}
