/**
 * A small decorative waveform, shaped deterministically from a seed string, so
 * every card gets its own silhouette without loading any audio. Server-rendered:
 * the same seed always produces the same bars.
 *
 * The bars are one `<path>` of round-capped line segments rather than one element
 * each — a landing page carrying a dozen of these would otherwise ship several
 * hundred nodes, twice over, once in the markup and again in the RSC payload.
 */
export function MiniWave({
  seed,
  color = "var(--accent)",
  bars = 32,
  className,
}: {
  seed: string;
  color?: string;
  bars?: number;
  className?: string;
}) {
  const random = seededRandom(seed);
  const slot = 100 / bars;
  const strokeWidth = slot * 0.5;

  const segments: string[] = [];
  for (let index = 0; index < bars; index += 1) {
    const taper = Math.sin((index / (bars - 1)) * Math.PI);
    const amplitude = Math.max(0.14, (0.25 + random() * 0.75) * (0.45 + taper * 0.55));
    const half = (amplitude * 20) / 2;
    const x = round(index * slot + slot / 2);
    segments.push(`M${x} ${round(12 - half)}V${round(12 + half)}`);
  }

  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d={segments.join("")}
        stroke={color}
        strokeWidth={round(strokeWidth)}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Mulberry32 seeded from the string, so output is stable across renders. */
function seededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
