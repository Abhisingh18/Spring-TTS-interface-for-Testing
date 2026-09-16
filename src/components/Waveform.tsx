"use client";

import { useEffect, useRef, useState } from "react";

import { formatClock } from "@/lib/format";
import { getPeaks, type Peaks } from "@/lib/peaks";
import { useThemeVersion } from "@/lib/useThemeVersion";

interface WaveformProps {
  src: string;
  /** The element this waveform tracks; progress is read straight off it. */
  audio: HTMLAudioElement | null;
  accent: string;
  duration: number;
  height?: number;
  /** Defer the fetch+decode until the card is on screen. */
  eager?: boolean;
  onSeek: (seconds: number) => void;
}

/**
 * Canvas waveform with a live playhead and a hover scrub line. Progress is read
 * from the media element inside a rAF loop rather than through React state, so a
 * playing clip never re-renders its card.
 */
export function Waveform({
  src,
  audio,
  accent,
  duration,
  height = 60,
  eager = false,
  onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const peaksRef = useRef<Peaks | null>(null);
  const hoverRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [visible, setVisible] = useState(eager);
  const [hover, setHover] = useState<number | null>(null);
  const themeVersion = useThemeVersion();

  // Only decode what the listener can actually see.
  useEffect(() => {
    if (visible) return;
    const node = wrapRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");

    getPeaks(src, controller.signal)
      .then((peaks) => {
        if (cancelled) return;
        peaksRef.current = peaks;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [src, visible]);

  // Draw loop: repaints on resize, on media events, and every frame while playing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frame = 0;
    let lastProgress = -1;
    let lastHover: number | null = null;

    const paint = (force = false) => {
      const progress = audio && duration > 0 ? audio.currentTime / duration : 0;
      const hoverAt = hoverRef.current;
      if (!force && Math.abs(progress - lastProgress) < 0.0005 && hoverAt === lastHover) return;
      lastProgress = progress;
      lastHover = hoverAt;
      draw(canvas, peaksRef.current, progress, accent, hoverAt);
    };

    const tick = () => {
      paint();
      if (audio && !audio.paused && !audio.ended) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const repaint = () => paint(true);

    paint(true);

    const observer = new ResizeObserver(repaint);
    observer.observe(canvas);

    const events: Array<[string, () => void]> = [
      ["play", start],
      ["playing", start],
      ["pause", repaint],
      ["ended", repaint],
      ["seeked", repaint],
      ["timeupdate", repaint],
      ["loadedmetadata", repaint],
    ];
    for (const [event, handler] of events) audio?.addEventListener(event, handler);
    if (audio && !audio.paused) start();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      for (const [event, handler] of events) audio?.removeEventListener(event, handler);
    };
  }, [audio, accent, duration, status, hover, themeVersion]);

  function fractionFrom(clientX: number): number {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  }

  function setHoverAt(fraction: number | null) {
    hoverRef.current = fraction;
    setHover(fraction);
  }

  return (
    <div ref={wrapRef} className="relative" style={{ height }}>
      <canvas
        ref={canvasRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek within clip"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 10) / 10}
        aria-valuenow={Math.round((audio?.currentTime ?? 0) * 10) / 10}
        className="h-full w-full cursor-pointer rounded-lg"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          onSeek(fractionFrom(event.clientX) * duration);
        }}
        onPointerMove={(event) => {
          const fraction = fractionFrom(event.clientX);
          setHoverAt(fraction);
          if (event.buttons === 1) onSeek(fraction * duration);
        }}
        onPointerLeave={() => setHoverAt(null)}
        onKeyDown={(event) => {
          if (!audio) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSeek(Math.max(audio.currentTime - 1, 0));
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            onSeek(Math.min(audio.currentTime + 1, duration));
          }
        }}
      />

      {hover !== null && status === "ready" ? (
        <span
          className="tnum pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-panel-raised px-1.5 py-0.5 font-mono text-[10px] text-ink shadow-sm"
          style={{ left: `${hover * 100}%` }}
        >
          {formatClock(hover * duration)}
        </span>
      ) : null}

      {status !== "ready" ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-[11px] text-faint">
            {status === "failed" ? "waveform unavailable" : "reading waveform…"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function draw(
  canvas: HTMLCanvasElement,
  peaks: Peaks | null,
  progress: number,
  accent: string,
  hover: number | null,
): void {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;

  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const idle = readVar(canvas, "--wave-idle", "#8891a8");
  // Model colours are CSS custom properties so light and dark can carry
  // different steps; canvas needs the resolved value.
  const stroke = resolveColor(canvas, accent);
  const middle = height / 2;

  if (!peaks) {
    context.fillStyle = idle;
    context.globalAlpha = 0.3;
    context.beginPath();
    context.roundRect(0, middle - 1, width, 2, 1);
    context.fill();
    context.globalAlpha = 1;
    return;
  }

  // Played bars fade from full accent at the start to a lighter tip, so the
  // playhead reads as the leading edge of the sound rather than a hard cut.
  const played = context.createLinearGradient(0, 0, width, 0);
  played.addColorStop(0, withAlpha(stroke, 0.7));
  played.addColorStop(1, stroke);

  const barWidth = 2;
  const gap = 1.5;
  const columns = Math.max(1, Math.floor(width / (barWidth + gap)));
  const playedColumns = progress * columns;
  const hoverColumns = hover === null ? -1 : hover * columns;

  for (let column = 0; column < columns; column += 1) {
    const bucket = Math.min(peaks.buckets - 1, Math.floor((column / columns) * peaks.buckets));
    const min = peaks.values[bucket * 2] ?? 0;
    const max = peaks.values[bucket * 2 + 1] ?? 0;
    const amplitude = Math.max(Math.abs(min), Math.abs(max));
    const barHeight = Math.max(2, amplitude * (height - 6));
    const isPlayed = column < playedColumns;
    const nearHover = hoverColumns >= 0 && Math.abs(column - hoverColumns) < 1.5;

    context.fillStyle = isPlayed ? played : idle;
    context.globalAlpha = isPlayed ? 1 : nearHover ? 0.85 : 0.5;
    context.beginPath();
    context.roundRect(column * (barWidth + gap), middle - barHeight / 2, barWidth, barHeight, 1);
    context.fill();
  }

  context.globalAlpha = 1;

  if (hover !== null) {
    context.fillStyle = idle;
    context.globalAlpha = 0.8;
    context.fillRect(hover * width - 0.5, 0, 1, height);
    context.globalAlpha = 1;
  }

  if (progress > 0 && progress < 1) {
    const x = progress * width;
    context.fillStyle = stroke;
    context.beginPath();
    context.roundRect(x - 1, 0, 2, height, 1);
    context.fill();
    // A soft halo makes the playhead findable on a busy waveform.
    context.globalAlpha = 0.28;
    context.beginPath();
    context.roundRect(x - 4, 0, 8, height, 4);
    context.fill();
    context.globalAlpha = 1;
  }
}

/** Turns `var(--m-seedvc)` into the colour the current theme resolves it to. */
function resolveColor(element: HTMLElement, value: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (!match?.[1]) return value;
  return getComputedStyle(element).getPropertyValue(match[1]).trim() || "#7c74ff";
}

/** `#rrggbb` → `rgba(r, g, b, a)`; anything else is handed back untouched. */
function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match?.[1]) return color;
  const value = Number.parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function readVar(element: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
}
