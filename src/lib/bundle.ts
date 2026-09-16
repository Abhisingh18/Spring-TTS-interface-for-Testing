import "server-only";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type {
  Bundle,
  Clip,
  ClipRole,
  ModelInfo,
  Pair,
  RawBundle,
  RawClip,
  RawSample,
} from "./types";

/** `npm run sync:bundle` writes the bundle JSON here so it can be deployed. */
const VENDORED_DATA_DIR = path.resolve(process.cwd(), "data");
/** …and the WAVs here, where they are served as ordinary static assets. */
const VENDORED_AUDIO_DIR = path.resolve(process.cwd(), "public", "audio");

const DEFAULT_BUNDLE_DIR = path.resolve(process.cwd(), "..", "portable_listening_bundle_16khz");

/**
 * Where the bundle JSON is read from, in order of preference:
 * BUNDLE_DIR, the vendored `data/` folder, then the sibling bundle folder.
 * On a host like Vercel only the vendored copy exists, which is the point.
 */
export function bundleDir(): string {
  const configured = process.env.BUNDLE_DIR?.trim();
  if (configured) return path.resolve(configured);
  if (existsSync(path.join(VENDORED_DATA_DIR, "listening_samples.json"))) {
    return VENDORED_DATA_DIR;
  }
  return DEFAULT_BUNDLE_DIR;
}

/**
 * Where the browser fetches audio from:
 *
 * - `NEXT_PUBLIC_AUDIO_BASE_URL` — an external origin (Vercel Blob, S3, R2…),
 *   for when the WAVs are too heavy to keep in the repository.
 * - `/audio/…` — vendored into `public/`, served straight off the CDN.
 * - `/api/audio/…` — streamed out of BUNDLE_DIR by the route handler, which is
 *   what local development uses before anything has been synced.
 */
let vendoredAudio: boolean | null = null;

function clipSrc(relativePath: string): string {
  const encoded = relativePath.split("/").map(encodeURIComponent).join("/");
  const external = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.trim();
  if (external) return `${external.replace(/\/+$/, "")}/${encoded}`;
  vendoredAudio ??= existsSync(VENDORED_AUDIO_DIR);
  return vendoredAudio ? `/${encoded}` : `/api/audio/${encoded}`;
}

interface ResampleRecord {
  path: string;
  resampled: boolean;
  output_subtype: string;
  input_sample_rate: number;
  output_sample_rate: number;
}

async function readJson<T>(file: string): Promise<T> {
  const absolute = path.join(bundleDir(), file);
  try {
    return JSON.parse(await readFile(absolute, "utf8")) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read "${file}" from the listening bundle at ${bundleDir()}. ` +
        `Set BUNDLE_DIR in .env.local to the folder holding listen.html. (${reason})`,
    );
  }
}

function clipKey(relativePath: string): string {
  return path.basename(relativePath).replace(/\.wav$/i, "");
}

function roleOf(label: string): ClipRole {
  if (label === "Source audio") return "source";
  if (label === "Target audio") return "target";
  return "model";
}

/** `EZ-VC (AR+EN+FR)` → `EZ-VC`; used for colour grouping of variants. */
function familyOf(label: string): string {
  const base = label.split("(")[0] ?? label;
  return base.replace(/\s+(zeroshot|baseline)\s*$/i, "").trim();
}

function toClip(
  raw: RawClip,
  folder: string,
  resampling: Map<string, ResampleRecord>,
): Clip {
  const key = clipKey(raw.path);
  const record = resampling.get(raw.path);
  const role = roleOf(raw.label);
  return {
    id: `${folder}/${key}`,
    key,
    label: raw.label,
    subtitle: raw.subtitle ?? "Converted source utterance",
    role,
    path: raw.path,
    src: clipSrc(raw.path),
    durationSeconds: raw.duration_seconds,
    sampleRate: raw.sample_rate,
    channels: raw.channels,
    bytes: raw.bytes,
    sha256: raw.sha256,
    resampled: record?.resampled ?? false,
    subtype: record?.output_subtype ?? null,
  };
}

function folderOf(sample: RawSample): string {
  const first = sample.audio[0];
  if (!first) throw new Error(`Sample "${sample.pair}" has no audio entries.`);
  // `audio/05_EGYCS-EGY/source_audio.wav` → `05_EGYCS-EGY`
  const segment = first.path.split("/")[1];
  if (!segment) throw new Error(`Unexpected audio path "${first.path}".`);
  return segment;
}

function slugify(folder: string): string {
  return folder.toLowerCase().replace(/_/g, "-");
}

function toPair(sample: RawSample, index: number, resampling: Map<string, ResampleRecord>): Pair {
  const folder = folderOf(sample);
  const clips = sample.audio.map((raw) => toClip(raw, folder, resampling));
  const source = clips.find((clip) => clip.role === "source");
  const target = clips.find((clip) => clip.role === "target");
  if (!source || !target) {
    throw new Error(`Pair "${sample.pair}" is missing a source or target reference clip.`);
  }
  const [sourceDialect = sample.pair, targetDialect = sample.pair] = sample.pair.split("-");

  return {
    index: index + 1,
    folder,
    slug: slugify(folder),
    name: sample.pair,
    sourceDialect,
    targetDialect,
    filename: sample.filename,
    listedTargetSpeaker: sample.listed_target_speaker,
    targetSpeaker: sample.target_speaker,
    targetUtt: sample.target_utt,
    sourceCorpus: sample.source_corpus,
    targetCorpus: sample.target_corpus,
    sourceText: sample.source_text,
    targetText: sample.target_text,
    note: sample.note,
    source,
    target,
    models: clips.filter((clip) => clip.role === "model"),
  };
}

/** Canonical model order, taken from the first sample in the bundle. */
function modelsOf(pairs: Pair[]): ModelInfo[] {
  const first = pairs[0];
  if (!first) return [];
  return first.models.map((clip, order) => ({
    key: clip.key,
    label: clip.label,
    family: familyOf(clip.label),
    order,
  }));
}

/**
 * Parses the bundle once per request-render. `cache` keeps repeated calls in a
 * single render cheap; the module-level promise keeps it cheap across renders.
 */
let cached: Promise<Bundle> | null = null;

export const getBundle = cache(async (): Promise<Bundle> => {
  cached ??= loadBundle();
  return cached;
});

async function loadBundle(): Promise<Bundle> {
  const raw = await readJson<RawBundle>("listening_samples.json");

  let resampling = new Map<string, ResampleRecord>();
  try {
    const report = await readJson<{ records: ResampleRecord[] }>("resampling_report.json");
    resampling = new Map(report.records.map((record) => [record.path, record]));
  } catch {
    // Optional file: the app still works without resampling provenance.
  }

  const pairs = raw.samples.map((sample, index) => toPair(sample, index, resampling));
  const clips = pairs.flatMap((pair) => [pair.source, pair.target, ...pair.models]);

  return {
    meta: {
      manifest: raw.manifest,
      targetResolution: raw.target_resolution,
      manifestSha256: raw.manifest_sha256,
      originalManifestSha256: raw.original_manifest_sha256 ?? null,
      audioProcessing: raw.audio_processing,
      bundleDir: bundleDir(),
    },
    pairs,
    models: modelsOf(pairs),
    stats: {
      pairs: pairs.length,
      models: pairs[0]?.models.length ?? 0,
      clips: clips.length,
      totalSeconds: clips.reduce((sum, clip) => sum + clip.durationSeconds, 0),
      totalBytes: clips.reduce((sum, clip) => sum + clip.bytes, 0),
      resampledClips: clips.filter((clip) => clip.resampled).length,
      preservedClips: clips.filter((clip) => !clip.resampled).length,
    },
  };
}

export async function getPair(slug: string): Promise<Pair | undefined> {
  const { pairs } = await getBundle();
  return pairs.find((pair) => pair.slug === slug);
}

/** Previous/next neighbours for pair-to-pair navigation. */
export async function getPairNeighbours(slug: string): Promise<{ prev?: Pair; next?: Pair }> {
  const { pairs } = await getBundle();
  const index = pairs.findIndex((pair) => pair.slug === slug);
  if (index === -1) return {};
  return { prev: pairs[index - 1], next: pairs[index + 1] };
}
