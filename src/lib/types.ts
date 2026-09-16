/** Shapes that mirror `listening_samples.json` in the portable bundle. */

export type ClipRole = "source" | "target" | "model";

export interface RawClip {
  label: string;
  path: string;
  duration_seconds: number;
  sample_rate: number;
  channels: number;
  bytes: number;
  sha256: string;
  subtitle?: string;
}

export interface RawSample {
  pair: string;
  filename: string;
  listed_target_speaker: string;
  target_speaker: string;
  target_utt: string;
  source_corpus: string;
  target_corpus: string;
  source_text: string;
  target_text: string;
  note: string;
  audio: RawClip[];
}

export interface RawBundle {
  manifest: string;
  target_resolution: string;
  manifest_sha256: string;
  original_manifest_sha256?: string;
  audio_processing: {
    sample_rate_hz: number;
    method: string;
    normalization: boolean;
    already_16khz: string;
  };
  samples: RawSample[];
}

/** Normalised, UI-facing shapes. */

export interface Clip {
  /** Stable id, unique across the whole bundle: `03_TUN-TUN/seedvc`. */
  id: string;
  /** Slug of the audio file without extension: `seedvc`, `source_audio`. */
  key: string;
  label: string;
  subtitle: string;
  role: ClipRole;
  /** Relative path inside the bundle, e.g. `audio/01_MSA-MSA/seedvc.wav`. */
  path: string;
  /** URL served by the audio route handler. */
  src: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  bytes: number;
  sha256: string;
  /** True when the bundle resampled this clip to 16 kHz. */
  resampled: boolean;
  /** PCM_16 or FLOAT as stored in the bundle. */
  subtype: string | null;
}

export interface Pair {
  /** 1-based position in the bundle. */
  index: number;
  /** Folder name, e.g. `05_EGYCS-EGY`. */
  folder: string;
  /** Route slug, e.g. `05-egycs-egy`. */
  slug: string;
  /** Display label, e.g. `EGYCS-EGY`. */
  name: string;
  sourceDialect: string;
  targetDialect: string;
  filename: string;
  listedTargetSpeaker: string;
  targetSpeaker: string;
  targetUtt: string;
  sourceCorpus: string;
  targetCorpus: string;
  sourceText: string;
  targetText: string;
  note: string;
  source: Clip;
  target: Clip;
  models: Clip[];
}

export interface ModelInfo {
  /** `seedvc`, `knn_vc_ar`, … — matches `Clip.key`. */
  key: string;
  label: string;
  /** Family used for grouping and colour: YourTTS, SeedVC, EZ-VC, … */
  family: string;
  /** Position in the canonical model order from the bundle. */
  order: number;
}

export interface BundleStats {
  pairs: number;
  models: number;
  clips: number;
  totalSeconds: number;
  totalBytes: number;
  resampledClips: number;
  preservedClips: number;
}

export interface Bundle {
  meta: {
    manifest: string;
    targetResolution: string;
    manifestSha256: string;
    originalManifestSha256: string | null;
    audioProcessing: RawBundle["audio_processing"];
    bundleDir: string;
  };
  pairs: Pair[];
  models: ModelInfo[];
  stats: BundleStats;
}
