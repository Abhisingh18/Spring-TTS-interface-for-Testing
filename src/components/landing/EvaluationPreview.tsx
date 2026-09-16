"use client";

import { useEffect, useRef, useState } from "react";

import { MiniWave } from "@/components/landing/MiniWave";

const CRITERIA = [
  { name: "Naturalness", a: 4.6, b: 4.1 },
  { name: "Speaker similarity", a: 4.8, b: 4.3 },
  { name: "Prosody", a: 4.4, b: 3.9 },
];

/**
 * A working miniature of the evaluator screen — the reference transport runs,
 * the criteria fill in, and the trial counter advances, so a visitor sees what
 * the product does within a few seconds instead of reading about it.
 */
export function EvaluationPreview() {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
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

  // The reference playhead sweeps, then each criterion lands in turn.
  useEffect(() => {
    if (!inView) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setProgress(0.62);
      setRevealed(CRITERIA.length);
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((value) => {
        const next = value + 0.006;
        if (next >= 1) {
          setRevealed(0);
          return 0;
        }
        setRevealed(Math.min(CRITERIA.length, Math.floor(next * 4)));
        return next;
      });
    }, 40);

    return () => window.clearInterval(interval);
  }, [inView]);

  const elapsed = progress * 8.4;

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-4xl motion-safe:animate-[float-slow_9s_ease-in-out_infinite]"
      style={{ perspective: "1400px" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -bottom-10 -top-6 -z-10 rounded-[3rem] opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 45%, color-mix(in oklab, var(--primary-from) 40%, transparent), transparent 72%)",
        }}
      />

      <div className="panel-raised sweep overflow-hidden rounded-3xl backdrop-blur-xl">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="1.5" y="6" width="1.6" height="4" rx="0.8" />
                <rect x="5" y="3" width="1.6" height="10" rx="0.8" />
                <rect x="8.5" y="1.5" width="1.6" height="13" rx="0.8" />
                <rect x="12" y="5" width="1.6" height="6" rx="0.8" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold tracking-tight text-ink">
                Kannada TTS — listening study
              </p>
              <p className="text-[11px] text-faint">Blind · rubric v2 · 12 evaluators</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-panel-solid px-2.5 py-1 text-[10px] font-medium text-accent sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              LIVE EXPERIMENT
            </span>
            <span className="tnum font-mono text-[11px] text-muted">Trial 08 / 40</span>
          </div>
        </header>

        <div className="space-y-4 p-5">
          <section>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                Reference
              </span>
              <span className="tnum font-mono text-[11px] text-muted">
                00:0{elapsed.toFixed(1)}
              </span>
            </div>
            <div className="relative h-10 overflow-hidden rounded-xl border border-line bg-panel-solid">
              <div className="absolute inset-0 px-2">
                <MiniWave
                  seed="reference-track"
                  color="var(--wave-idle)"
                  bars={72}
                  className="h-full w-full"
                />
              </div>
              {/* Same waveform in accent, revealed left-to-right by a clip. */}
              <div
                className="absolute inset-0 px-2"
                aria-hidden="true"
                style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
              >
                <MiniWave
                  seed="reference-track"
                  color="var(--accent)"
                  bars={72}
                  className="h-full w-full"
                />
              </div>
              <span
                className="absolute inset-y-1 w-px bg-accent"
                style={{ left: `${progress * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["A", "B"] as const).map((label, index) => (
              <section
                key={label}
                className="rounded-2xl border border-line bg-panel-solid/70 p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: index === 0 ? "var(--accent)" : "var(--teal)",
                      color: "#fff",
                    }}
                  >
                    ▶
                  </span>
                  <span className="text-[13px] font-semibold text-ink">Model {label}</span>
                  <span className="ml-auto rounded-md bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-faint">
                    hidden
                  </span>
                </div>
                <MiniWave
                  seed={`model-${label}`}
                  color={index === 0 ? "var(--accent)" : "var(--teal)"}
                  bars={44}
                  className="mt-2.5 h-8 w-full opacity-80"
                />
              </section>
            ))}
          </div>

          <section className="rounded-2xl border border-line bg-panel-solid/70 p-3.5">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              <span>Criterion</span>
              <span className="w-10 text-right">A</span>
              <span className="w-10 text-right">B</span>
            </div>
            <ul className="mt-2 space-y-2">
              {CRITERIA.map((criterion, index) => {
                const shown = index < revealed;
                return (
                  <li
                    key={criterion.name}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[13px]"
                  >
                    <span className="flex items-center gap-2 text-ink">
                      {criterion.name}
                      <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-sunken sm:block">
                        <span
                          className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                          style={{ width: shown ? `${(criterion.a / 5) * 100}%` : "0%" }}
                        />
                      </span>
                    </span>
                    <span
                      className="tnum w-10 text-right font-semibold text-ink transition-opacity duration-500"
                      style={{ opacity: shown ? 1 : 0.15 }}
                    >
                      {criterion.a.toFixed(1)}
                    </span>
                    <span
                      className="tnum w-10 text-right text-muted transition-opacity duration-500"
                      style={{ opacity: shown ? 1 : 0.15 }}
                    >
                      {criterion.b.toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <button
            type="button"
            disabled
            className="w-full cursor-default rounded-xl bg-accent py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            Submit evaluation
          </button>
        </div>
      </div>
    </div>
  );
}
