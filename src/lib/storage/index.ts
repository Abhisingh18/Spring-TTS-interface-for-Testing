import "server-only";

import { tmpdir } from "node:os";
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
  const url = candidates.map((value) => value?.trim()).find((value) => Boolean(value));

  // Prisma Postgres hands out `prisma+postgres://…`, an Accelerate endpoint that
  // speaks HTTP rather than the Postgres wire protocol. `pg` cannot dial it, so
  // treat it as absent instead of failing every write at runtime.
  if (url?.startsWith("prisma+postgres://") || url?.startsWith("prisma://")) {
    return undefined;
  }
  return url;
}

/** True on hosts whose application directory is read-only. */
function serverless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function dataFile(): string {
  const configured = process.env.DATA_FILE?.trim();
  if (configured) return path.resolve(configured);

  // A serverless deployment cannot write beside the code. The temp directory is
  // writable but per-instance and short-lived — enough to keep sign-in and
  // rating submission working, not enough to keep the data. Attach Postgres for
  // anything that has to survive.
  if (serverless()) return path.join(tmpdir(), "ses-listening-sessions.json");

  return path.resolve(process.cwd(), ".data", "listening-sessions.json");
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
  if (connectionString()) return "Postgres";
  if (serverless()) {
    return `a temporary file (${dataFile()}) — this host discards it between requests, so attach Postgres before collecting real data`;
  }
  return `JSON file · ${dataFile()}`;
}
