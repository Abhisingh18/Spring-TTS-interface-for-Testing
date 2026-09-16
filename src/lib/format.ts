export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(2)} s`;
}

/** `9.796` → `0:09.8` — compact enough for a player readout. */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatKhz(sampleRate: number): string {
  return `${Math.round(sampleRate / 100) / 10} kHz`;
}

export function shortHash(sha256: string): string {
  return sha256.slice(0, 10);
}

/** Signed difference against the source duration, e.g. `+0.66 s`. */
export function formatDelta(seconds: number): string {
  const sign = seconds > 0 ? "+" : seconds < 0 ? "−" : "±";
  return `${sign}${Math.abs(seconds).toFixed(2)} s`;
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
