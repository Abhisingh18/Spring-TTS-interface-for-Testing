import "server-only";

import path from "node:path";

import { createFileStore } from "./file-store";
import { createPostgresStore } from "./postgres-store";
import type { Store } from "./types";

export type {
  FeedbackRecord,
  ParticipantRecord,
  RatingRecord,
  Snapshot,
  Store,
} from "./types";

/**
 * Picks the driver from the environment:
 *
 * - `DATABASE_URL` / `POSTGRES_URL` present → Postgres. Vercel injects one of
 *   these when you attach a database, so a deployment needs no other change.
 * - otherwise → a JSON file, by default `.data/listening-sessions.json` inside
 *   the project. Fine for local use and for any host with a writable disk.
 */
function connectionString(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ];
  return candidates.map((value) => value?.trim()).find((value) => Boolean(value));
}

function dataFile(): string {
  const configured = process.env.DATA_FILE?.trim();
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), ".data", "listening-sessions.json");
}

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  const url = connectionString();
  store = url ? createPostgresStore(url) : createFileStore(dataFile());
  return store;
}

/** Where submissions are going, for the note on the admin page. */
export function storeDescription(): string {
  return connectionString() ? "Postgres" : `JSON file · ${dataFile()}`;
}
