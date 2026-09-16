"use client";

import { useEffect, useRef, useState } from "react";

const BINS = 44;
const COLUMNS = 150;

/**
 * A drifting spectrogram field. The energy is synthesised from layered sines
 * rather than sampled from a file, so the section costs nothing to load while
 * still reading as a real time–frequency view.
 */
export function SpectrogramField({ height = 200 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) =>
      setInView(entries.some((entry) => entry.isIntersecting)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !inView) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frame = 0;

    const render = (now: number) => {
      paint(canvas, reduced ? 2 : (now - started) / 1000);
      // A spectrogram does not need 60 fps to read as alive.
      if (!reduced) frame = window.setTimeout(() => requestAnimationFrame(render), 55) as unknown as number;
    };
    requestAnimationFrame(render);

    const observer = new ResizeObserver(() => paint(canvas, 2));
    observer.observe(canvas);

    return () => {
      window.clearTimeout(frame);
      observer.disconnect();
    };
  }, [inView]);

  return (
    <div ref={wrapRef} className="overflow-hidden rounded-2xl border border-line bg-panel-solid">
      <canvas ref={canvasRef} aria-hidden="true" className="block w-full" style={{ height }} />
    </div>
  );
}

function paint(canvas: HTMLCanvasElement, time: number): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
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

  const cellWidth = width / COLUMNS;
  const cellHeight = height / BINS;

  for (let column = 0; column < COLUMNS; column += 1) {
    const t = column / COLUMNS;
    // Formant-ish bands that drift and a syllabic envelope that gates them.
    const envelope = Math.max(0, Math.sin(t * 9 - time * 1.1)) ** 1.4;

    for (let bin = 0; bin < BINS; bin += 1) {
      const f = bin / BINS;
      const band =
        Math.exp(-Math.pow((f - 0.12 - Math.sin(time * 0.5 + t * 3) * 0.02) * 9, 2)) * 1 +
        Math.exp(-Math.pow((f - 0.3 - Math.sin(time * 0.4 + t * 5) * 0.03) * 11, 2)) * 0.75 +
        Math.exp(-Math.pow((f - 0.52) * 13, 2)) * 0.45 +
        Math.exp(-Math.pow((f - 0.74) * 16, 2)) * 0.22;

      const noise = (Math.sin(column * 12.9898 + bin * 78.233) * 43758.5453) % 1;
      const energy = Math.min(1, envelope * band * (0.82 + Math.abs(noise) * 0.3));
      if (energy < 0.035) continue;

      // Single-hue ramp, light to saturated: magnitude, not identity.
      const alpha = Math.min(0.92, energy * 1.15);
      const mix = Math.round(energy * 100);
      context.fillStyle = `color-mix(in oklab, #3852d7 ${mix}%, #eef1fd)`;
      context.globalAlpha = alpha;
      context.fillRect(
        column * cellWidth,
        height - (bin + 1) * cellHeight,
        Math.ceil(cellWidth) + 0.5,
        Math.ceil(cellHeight) + 0.5,
      );
    }
  }

  context.globalAlpha = 1;
}
