"use client";

import { useEffect, useRef } from "react";

import { useThemeVersion } from "@/lib/useThemeVersion";

const BAR_COUNT = 96;

/**
 * The hero's moving waveform. Two layered envelopes — a slow breathing shape and
 * a travelling pulse — read as speech without pretending to be any real clip.
 * Static single frame when the visitor asks for reduced motion.
 */
export function HeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const themeVersion = useThemeVersion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const started = performance.now();

    const render = (now: number) => {
      const time = (now - started) / 1000;
      paint(canvas, reduced ? 0 : time);
      if (!reduced) frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    const observer = new ResizeObserver(() => paint(canvas, reduced ? 0 : (performance.now() - started) / 1000));
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [themeVersion]);

  return (
    <div className="relative">
      {/* Glow pads behind the bars so the canvas does not float on flat colour. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(40% 60% at 25% 50%, var(--accent-glow), transparent 70%), radial-gradient(38% 58% at 75% 50%, var(--teal-soft), transparent 70%)",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-28 w-full sm:h-36"
      />
    </div>
  );
}

function paint(canvas: HTMLCanvasElement, time: number): void {
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

  const styles = getComputedStyle(canvas);
  const accent = styles.getPropertyValue("--accent").trim() || "#7c74ff";
  const teal = styles.getPropertyValue("--teal").trim() || "#2dd4bf";

  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, teal);
  gradient.addColorStop(0.55, accent);
  gradient.addColorStop(1, teal);
  context.fillStyle = gradient;

  const middle = height / 2;
  const slot = width / BAR_COUNT;
  const barWidth = Math.max(2, slot * 0.42);

  for (let index = 0; index < BAR_COUNT; index += 1) {
    const position = index / (BAR_COUNT - 1);

    // Speech-like envelope: syllable-scale swell × a faster formant ripple.
    const syllable = Math.sin(position * 7.5 + time * 1.15) * 0.5 + 0.5;
    const ripple = Math.sin(position * 31 + time * 3.1) * 0.5 + 0.5;
    const taper = Math.sin(position * Math.PI); // quiet at both edges

    // A bright pulse sweeping left to right, like a playhead passing through.
    const pulseAt = (time * 0.22) % 1.4 - 0.2;
    const pulse = Math.exp(-Math.pow((position - pulseAt) * 6, 2));

    const amplitude = taper * (0.22 + syllable * 0.5 + ripple * 0.22) + pulse * 0.42;
    const barHeight = Math.max(3, Math.min(amplitude, 1.1) * (height - 8));

    context.globalAlpha = 0.35 + taper * 0.4 + pulse * 0.35;
    context.beginPath();
    context.roundRect(
      index * slot + (slot - barWidth) / 2,
      middle - barHeight / 2,
      barWidth,
      barHeight,
      barWidth / 2,
    );
    context.fill();
  }

  context.globalAlpha = 1;
}
