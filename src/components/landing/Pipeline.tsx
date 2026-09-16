import { MiniWave } from "@/components/landing/MiniWave";

const STAGES = [
  { id: "datasets", label: "Datasets", detail: "Versioned and frozen once published" },
  { id: "samples", label: "Samples", detail: "UUID identity, checksummed audio assets" },
  { id: "models", label: "Models", detail: "Every checkpoint kept as its own version" },
  { id: "experiments", label: "Experiments", detail: "Rubric, evaluators and seed pinned" },
  { id: "evaluation", label: "Evaluation", detail: "Blind trials, server-side randomisation" },
  { id: "results", label: "Results", detail: "Distributions, agreement, effect sizes" },
  { id: "reports", label: "Reports", detail: "Reproducibility package, PDF, CSV, JSON" },
];

/**
 * The spine of the platform, drawn as a flow with a packet travelling it. Each
 * stage is a real entity in the schema, not an illustration.
 */
export function ArchitecturePipeline() {
  return (
    <div className="ses-grid panel relative overflow-hidden rounded-3xl p-5 sm:p-8">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px w-full -translate-y-1/2 lg:block"
        preserveAspectRatio="none"
        viewBox="0 0 100 1"
      >
        <line x1="2" y1="0.5" x2="98" y2="0.5" stroke="var(--border-strong)" strokeWidth="0.4" />
        <line
          x1="2"
          y1="0.5"
          x2="98"
          y2="0.5"
          stroke="var(--accent)"
          strokeWidth="0.8"
          strokeDasharray="6 94"
          className="motion-safe:animate-[flow-dash_4s_linear_infinite]"
        />
      </svg>

      <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
        {STAGES.map((stage, index) => (
          <li key={stage.id} className="group/stage">
            <div className="panel-raised sweep h-full rounded-2xl p-3.5 transition-transform duration-300 hover:-translate-y-1.5">
              <div className="flex items-center justify-between">
                <span className="tnum font-mono text-[10px] text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 0 4px var(--accent-soft)",
                  }}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-sm font-semibold tracking-tight text-ink">{stage.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted opacity-70 transition-opacity duration-300 group-hover/stage:opacity-100">
                {stage.detail}
              </p>
              <MiniWave
                seed={stage.id}
                color="var(--accent)"
                bars={18}
                className="mt-2.5 h-4 w-full opacity-40 transition-opacity duration-300 group-hover/stage:opacity-90"
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
