import "server-only";

import { getBundle } from "./bundle";
import type { Pair } from "./types";

/**
 * A collection is one benchmark a member can be asked to evaluate: a language,
 * a task and the pairs that belong to it.
 *
 * Right now the app serves a single bundle, so exactly one collection is derived
 * from it. The shape is what matters — adding Hindi, Kannada or any other set
 * later means registering another entry here (and, once the database lands,
 * reading these rows from `projects` / `experiments` instead of this file).
 */
export interface Collection {
  id: string;
  name: string;
  language: string;
  /** Native-script rendering of the language name, when it has one. */
  languageNative?: string;
  task: string;
  description: string;
  status: "ready" | "draft";
  pairs: Pair[];
  stats: {
    pairs: number;
    models: number;
    clips: number;
    totalSeconds: number;
    dialects: string[];
    corpora: string[];
  };
}

function describe(pairs: Pair[]): Collection["stats"] {
  const dialects = new Set<string>();
  const corpora = new Set<string>();
  let clips = 0;
  let totalSeconds = 0;

  for (const pair of pairs) {
    dialects.add(pair.sourceDialect);
    dialects.add(pair.targetDialect);
    corpora.add(pair.sourceCorpus);
    corpora.add(pair.targetCorpus);
    for (const clip of [pair.source, pair.target, ...pair.models]) {
      clips += 1;
      totalSeconds += clip.durationSeconds;
    }
  }

  return {
    pairs: pairs.length,
    models: pairs[0]?.models.length ?? 0,
    clips,
    totalSeconds,
    dialects: [...dialects].sort(),
    corpora: [...corpora].sort(),
  };
}

export async function listCollections(): Promise<Collection[]> {
  const { pairs } = await getBundle();

  return [
    {
      id: "arabic-vc",
      name: "Arabic voice conversion",
      language: "Arabic",
      languageNative: "العربية",
      task: "Voice conversion",
      description:
        "Ten dialect routes across Modern Standard, Egyptian, Tunisian, Emirati, Algerian, Palestinian and Yemeni Arabic — several of them code-switching with English and French.",
      status: "ready",
      pairs,
      stats: describe(pairs),
    },
  ];
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  const collections = await listCollections();
  return collections.find((collection) => collection.id === id);
}

/** The collection a pair belongs to, for breadcrumbs on the pair page. */
export async function collectionForPair(pairSlug: string): Promise<Collection | undefined> {
  const collections = await listCollections();
  return collections.find((collection) =>
    collection.pairs.some((pair) => pair.slug === pairSlug),
  );
}
