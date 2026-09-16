"use client";

/**
 * Waveform peak extraction. Each clip is fetched and decoded once per session,
 * then reduced to min/max pairs per pixel bucket. Results are memoised by URL so
 * moving between pairs never re-decodes the same file.
 */

export interface Peaks {
  /** Interleaved [min, max] per bucket, each in −1…1. */
  values: Float32Array;
  buckets: number;
  duration: number;
}

const BUCKETS = 480;
const MAX_PARALLEL_DECODES = 3;

const cache = new Map<string, Promise<Peaks>>();
let context: AudioContext | null = null;
let inFlight = 0;
const queue: Array<() => void> = [];

function audioContext(): AudioContext {
  context ??= new (window.AudioContext ?? window.webkitAudioContext)();
  return context;
}

function acquireSlot(): Promise<void> {
  if (inFlight < MAX_PARALLEL_DECODES) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  inFlight -= 1;
  queue.shift()?.();
}

export function getPeaks(url: string, signal?: AbortSignal): Promise<Peaks> {
  const existing = cache.get(url);
  if (existing) return existing;

  const task = (async () => {
    await acquireSlot();
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
      const buffer = await response.arrayBuffer();
      const decoded = await audioContext().decodeAudioData(buffer);
      return reduce(decoded);
    } finally {
      releaseSlot();
    }
  })();

  // A failed decode should not poison the cache for a later retry.
  task.catch(() => cache.delete(url));
  cache.set(url, task);
  return task;
}

function reduce(buffer: AudioBuffer): Peaks {
  const channel = buffer.getChannelData(0);
  const buckets = Math.min(BUCKETS, Math.max(1, channel.length));
  const step = channel.length / buckets;
  const values = new Float32Array(buckets * 2);

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = Math.floor(bucket * step);
    const end = Math.min(Math.floor((bucket + 1) * step), channel.length);
    let min = 0;
    let max = 0;
    for (let i = start; i < end; i += 1) {
      const sample = channel[i] ?? 0;
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }
    values[bucket * 2] = min;
    values[bucket * 2 + 1] = max;
  }

  return { values, buckets, duration: buffer.duration };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
