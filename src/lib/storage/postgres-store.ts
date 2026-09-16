import { Pool } from "pg";

import type {
  FeedbackRecord,
  ParticipantRecord,
  RatingRecord,
  Snapshot,
  Store,
} from "./types";

/**
 * Postgres driver, used whenever a connection string is present. It works with
 * any provider — Vercel Postgres / Neon, Supabase, Railway — because it is
 * plain SQL over `pg`. Tables are created on first use.
 */
export function createPostgresStore(connectionString: string): Store {
  const pool = new Pool({
    connectionString,
    // Hosted Postgres terminates idle connections; keep the pool small and
    // short-lived so serverless invocations do not hold them open.
    max: 3,
    idleTimeoutMillis: 10_000,
    ssl: connectionString.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
  });

  let ready: Promise<void> | null = null;

  function migrate(): Promise<void> {
    ready ??= (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS listening_participants (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          created_at  TIMESTAMPTZ NOT NULL,
          last_seen_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS listening_ratings (
          participant_id   TEXT NOT NULL,
          participant_name TEXT NOT NULL,
          pair_slug        TEXT NOT NULL,
          model_key        TEXT NOT NULL,
          naturalness      SMALLINT,
          similarity       SMALLINT,
          note             TEXT,
          updated_at       TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (participant_id, pair_slug, model_key)
        );
        CREATE TABLE IF NOT EXISTS listening_feedback (
          participant_id   TEXT PRIMARY KEY,
          participant_name TEXT NOT NULL,
          text             TEXT NOT NULL,
          updated_at       TIMESTAMPTZ NOT NULL
        );
      `);
    })();
    return ready;
  }

  async function query<T extends Record<string, unknown>>(
    text: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    await migrate();
    const result = await pool.query<T>(text, values);
    return result.rows;
  }

  return {
    kind: "postgres",

    upsertParticipant: async (participant) => {
      await query(
        `INSERT INTO listening_participants (id, name, created_at, last_seen_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, last_seen_at = EXCLUDED.last_seen_at`,
        [participant.id, participant.name, participant.createdAt, participant.lastSeenAt],
      );
    },

    saveRating: async (rating) => {
      await query(
        `INSERT INTO listening_ratings
           (participant_id, participant_name, pair_slug, model_key, naturalness, similarity, note, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (participant_id, pair_slug, model_key) DO UPDATE SET
           participant_name = EXCLUDED.participant_name,
           naturalness = EXCLUDED.naturalness,
           similarity = EXCLUDED.similarity,
           note = EXCLUDED.note,
           updated_at = EXCLUDED.updated_at`,
        [
          rating.participantId,
          rating.participantName,
          rating.pairSlug,
          rating.modelKey,
          rating.naturalness,
          rating.similarity,
          rating.note,
          rating.updatedAt,
        ],
      );
    },

    saveFeedback: async (feedback) => {
      await query(
        `INSERT INTO listening_feedback (participant_id, participant_name, text, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (participant_id) DO UPDATE SET
           participant_name = EXCLUDED.participant_name,
           text = EXCLUDED.text,
           updated_at = EXCLUDED.updated_at`,
        [feedback.participantId, feedback.participantName, feedback.text, feedback.updatedAt],
      );
    },

    ratingsFor: async (participantId) => {
      const rows = await query<RatingRow>(
        `SELECT * FROM listening_ratings WHERE participant_id = $1`,
        [participantId],
      );
      return rows.map(toRating);
    },

    snapshot: async (): Promise<Snapshot> => {
      const [participants, ratings, feedback] = await Promise.all([
        query<ParticipantRow>(`SELECT * FROM listening_participants ORDER BY created_at`),
        query<RatingRow>(`SELECT * FROM listening_ratings ORDER BY updated_at`),
        query<FeedbackRow>(`SELECT * FROM listening_feedback ORDER BY updated_at`),
      ]);
      return {
        participants: participants.map(toParticipant),
        ratings: ratings.map(toRating),
        feedback: feedback.map(toFeedback),
      };
    },
  };
}

interface ParticipantRow extends Record<string, unknown> {
  id: string;
  name: string;
  created_at: Date;
  last_seen_at: Date;
}

interface RatingRow extends Record<string, unknown> {
  participant_id: string;
  participant_name: string;
  pair_slug: string;
  model_key: string;
  naturalness: number | null;
  similarity: number | null;
  note: string | null;
  updated_at: Date;
}

interface FeedbackRow extends Record<string, unknown> {
  participant_id: string;
  participant_name: string;
  text: string;
  updated_at: Date;
}

function toParticipant(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
  };
}

function toRating(row: RatingRow): RatingRecord {
  return {
    participantId: row.participant_id,
    participantName: row.participant_name,
    pairSlug: row.pair_slug,
    modelKey: row.model_key,
    naturalness: row.naturalness,
    similarity: row.similarity,
    note: row.note,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toFeedback(row: FeedbackRow): FeedbackRecord {
  return {
    participantId: row.participant_id,
    participantName: row.participant_name,
    text: row.text,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
