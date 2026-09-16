"use client";

import { useEffect, useRef, useState } from "react";

const MODELS = [
  { name: "XEUS v1.2", value: 4.62, delta: "+12.4%" },
  { name: "Whisper L-v3", value: 4.31, delta: "+8.7%" },
  { name: "data2vec 2.0", value: 3.88, delta: "+2.1%" },
  { name: "Baseline", value: 3.42, delta: "—" },
];

/**
 * Preview of the results view. Bars carry magnitude in one hue and every bar is
 * directly labelled, so identity never depends on colour. The numbers here are
 * illustrative placeholders, marked as such in the caption.
 */
export function AnalyticsPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-60px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <figure className="panel rounded-3xl p-5 sm:p-6">
        <figcaption className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-ink">
              Mean naturalness by model
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Scale 1–5 · illustrative figures, not measured results
            </p>
          </div>
          <span className="rounded-lg border border-line bg-panel-solid px-2 py-1 text-[10px] font-medium text-muted">
            n = 480 ratings
          </span>
        </figcaption>

        <ul className="space-y-3.5">
          {MODELS.map((model, index) => (
            <li key={model.name} className="grid grid-cols-[8.5rem_1fr_3rem] items-center gap-3">
              <span className="truncate text-sm text-ink">{model.name}</span>
              <span className="relative flex h-2.5 items-center">
                <span className="absolute inset-x-0 h-2.5 rounded-full bg-sunken" aria-hidden="true" />
                <span
                  className="relative h-2.5 rounded-full"
                  style={{
                    width: shown ? `${(model.value / 5) * 100}%` : "0%",
                    background: "var(--accent)",
                    transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${index * 110}ms`,
                  }}
                />
              </span>
              <span className="tnum text-right text-sm font-semibold text-ink">
                {model.value.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-4">
          {[
            ["Mean", "4.06"],
            ["Median", "4.20"],
            ["Std. dev.", "0.74"],
            ["95% CI", "±0.11"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {label}
              </p>
              <p className="tnum mt-0.5 text-lg font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </figure>

      <div className="grid gap-4">
        <div className="panel rounded-3xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Inter-rater agreement
          </p>
          <p className="tnum mt-2 text-4xl font-semibold tracking-tight text-ink">0.91</p>
          <p className="mt-1 text-xs text-muted">
            Krippendorff&rsquo;s alpha, ordinal — the analytics layer records which statistic it
            used and why.
          </p>
        </div>

        <div className="panel rounded-3xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Human + automatic
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["Naturalness", "human"],
              ["Speaker similarity", "human"],
              ["WER / CER", "automatic"],
              ["Duration drift", "automatic"],
            ].map(([metric, kind]) => (
              <li key={metric} className="flex items-center justify-between gap-2">
                <span className="text-ink">{metric}</span>
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    background: kind === "human" ? "var(--accent-soft)" : "var(--sunken)",
                    color: kind === "human" ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {kind}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-muted">
            Correlate perception against computed metrics on the same axis.
          </p>
        </div>
      </div>
    </div>
  );
}
