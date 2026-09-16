"use client";

import { useEffect, useRef } from "react";

interface Node {
  id: string;
  label: string;
  /** Position in 0–1 space so the layout survives any canvas size. */
  x: number;
  y: number;
  phase: number;
}

const NODES: Node[] = [
  { id: "dataset", label: "Dataset", x: 0.14, y: 0.26, phase: 0 },
  { id: "model", label: "Model", x: 0.82, y: 0.22, phase: 1.6 },
  { id: "experiment", label: "Experiment", x: 0.48, y: 0.52, phase: 3.1 },
  { id: "evaluation", label: "Evaluation", x: 0.5, y: 0.84, phase: 4.4 },
];

const EDGES: Array<[string, string]> = [
  ["dataset", "experiment"],
  ["model", "experiment"],
  ["experiment", "evaluation"],
];

/**
 * The hero backdrop: three drifting waveform bands, the research graph that the
 * platform is actually built around, and a pointer that nudges both. Every
 * moving part maps to something real — nothing here is decoration for its own
 * sake. Falls back to a single static frame under reduced-motion.
 */
export function HeroCanvas({ showGraph = true }: { showGraph?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frame = 0;

    const render = (now: number) => {
      paint(canvas, reduced ? 0 : (now - started) / 1000, pointer.current, showGraph);
      if (!reduced) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
        active: true,
      };
    };
    const onPointerLeave = () => {
      pointer.current = { ...pointer.current, active: false };
    };

    const parent = canvas.parentElement;
    parent?.addEventListener("pointermove", onPointerMove);
    parent?.addEventListener("pointerleave", onPointerLeave);

    const observer = new ResizeObserver(() =>
      paint(canvas, reduced ? 0 : (performance.now() - started) / 1000, pointer.current, showGraph),
    );
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      parent?.removeEventListener("pointermove", onPointerMove);
      parent?.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [showGraph]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}

function paint(
  canvas: HTMLCanvasElement,
  time: number,
  pointer: { x: number; y: number; active: boolean },
  showGraph: boolean,
): void {
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

  drawWaveBands(context, width, height, time, pointer);
  if (showGraph) drawGraph(context, width, height, time, pointer);
}

/** Three thin bands, each a sum of sines, drifting at different speeds. */
function drawWaveBands(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointer: { x: number; y: number; active: boolean },
): void {
  const bands = [
    { y: 0.42, amplitude: 26, speed: 0.55, alpha: 0.5, colour: "#7a98f8" },
    { y: 0.5, amplitude: 38, speed: 0.34, alpha: 0.34, colour: "#3852d7" },
    { y: 0.6, amplitude: 20, speed: 0.72, alpha: 0.22, colour: "#6991c7" },
  ];

  for (const band of bands) {
    context.beginPath();
    for (let x = 0; x <= width; x += 6) {
      const position = x / width;
      // Pointer adds a local swell, so the surface answers the cursor.
      const distance = pointer.active ? Math.abs(position - pointer.x) : 1;
      const lift = pointer.active ? Math.exp(-Math.pow(distance * 7, 2)) * 22 : 0;

      const y =
        height * band.y +
        Math.sin(position * 6.5 + time * band.speed) * band.amplitude +
        Math.sin(position * 17 - time * band.speed * 1.8) * band.amplitude * 0.34 -
        lift;

      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = band.colour;
    context.globalAlpha = band.alpha;
    context.lineWidth = 1.4;
    context.stroke();
  }
  context.globalAlpha = 1;
}

/** Dataset / Model → Experiment → Evaluation, with a packet moving each edge. */
function drawGraph(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointer: { x: number; y: number; active: boolean },
): void {
  const placed = new Map<string, { x: number; y: number }>();

  for (const node of NODES) {
    const drift = Math.sin(time * 0.6 + node.phase) * 6;
    let x = node.x * width;
    let y = node.y * height + drift;

    if (pointer.active) {
      // Nodes lean gently away from the cursor, like a field being disturbed.
      const dx = x - pointer.x * width;
      const dy = y - pointer.y * height;
      const distance = Math.hypot(dx, dy) || 1;
      const push = Math.min(900 / (distance * distance), 14);
      x += (dx / distance) * push;
      y += (dy / distance) * push;
    }

    placed.set(node.id, { x, y });
  }

  for (const [fromId, toId] of EDGES) {
    const from = placed.get(fromId);
    const to = placed.get(toId);
    if (!from || !to) continue;

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = "#3852d7";
    context.globalAlpha = 0.18;
    context.lineWidth = 1;
    context.stroke();

    // One packet per edge, offset so they do not travel in lockstep.
    const progress = (time * 0.32 + fromId.length * 0.21) % 1;
    const px = from.x + (to.x - from.x) * progress;
    const py = from.y + (to.y - from.y) * progress;

    const glow = context.createRadialGradient(px, py, 0, px, py, 9);
    glow.addColorStop(0, "rgba(56, 82, 215, 0.85)");
    glow.addColorStop(1, "rgba(56, 82, 215, 0)");
    context.globalAlpha = 1;
    context.fillStyle = glow;
    context.beginPath();
    context.arc(px, py, 9, 0, Math.PI * 2);
    context.fill();
  }

  for (const node of NODES) {
    const point = placed.get(node.id);
    if (!point) continue;

    const pulse = 1 + Math.sin(time * 1.5 + node.phase) * 0.12;

    const halo = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 26 * pulse);
    halo.addColorStop(0, "rgba(122, 152, 248, 0.3)");
    halo.addColorStop(1, "rgba(56, 82, 215, 0)");
    context.fillStyle = halo;
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(point.x, point.y, 26 * pulse, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(point.x, point.y, 5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#3852d7";
    context.lineWidth = 1.6;
    context.stroke();

    context.fillStyle = "rgba(36, 32, 26, 0.45)";
    context.font =
      '600 10px ui-sans-serif, system-ui, "Segoe UI", sans-serif';
    context.textAlign = "center";
    context.fillText(node.label.toUpperCase(), point.x, point.y - 16);
  }

  context.globalAlpha = 1;
}
