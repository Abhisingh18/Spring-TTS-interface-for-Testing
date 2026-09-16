import { MiniWave } from "@/components/landing/MiniWave";

const SIDEBAR = [
  "Overview",
  "Members",
  "Teams",
  "Projects",
  "Models",
  "Datasets",
  "Evaluation",
  "Storage",
  "Audit",
  "Settings",
];

const ACTIVITY = [
  ["Abhishek", "registered", "XEUS v1.2"],
  ["Ravi", "completed", "evaluation session #182"],
  ["Priya", "uploaded", "FLEURS v2 · 1 204 samples"],
  ["System", "finished", "waveform generation · 3 000 assets"],
];

/** The organization control centre, drawn as the real admin shell it maps to. */
export function OrgControlCenter() {
  return (
    <div className="ses-grid panel relative overflow-hidden rounded-3xl p-2 sm:p-3">
      <div className="relative grid overflow-hidden rounded-2xl border border-line bg-panel-solid/80 lg:grid-cols-[13rem_1fr]">
        <aside className="hidden border-r border-line p-3 lg:block">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            Organization
          </p>
          <ul className="space-y-0.5">
            {SIDEBAR.map((item, index) => (
              <li key={item}>
                <span
                  className={
                    index === 0
                      ? "flex items-center gap-2 rounded-lg bg-accent-soft px-2.5 py-1.5 text-[13px] font-medium text-accent"
                      : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-muted"
                  }
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: index === 0 ? "var(--accent)" : "var(--border-strong)" }}
                    aria-hidden="true"
                  />
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-4 sm:p-5">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <p className="text-sm font-semibold tracking-tight text-ink">Spring Lab · Speech AI</p>
            <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] font-medium text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
              All systems healthy
            </span>
          </header>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Members", "48"],
              ["Projects", "21"],
              ["Experiments", "86"],
              ["Samples", "1.8M"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-panel-solid px-3 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  {label}
                </dt>
                <dd className="tnum mt-0.5 text-xl font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_15rem]">
            <section className="rounded-xl border border-line bg-panel-solid p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Recent activity
              </p>
              <ul className="mt-2 space-y-1.5">
                {ACTIVITY.map(([who, did, what]) => (
                  <li key={`${who}-${what}`} className="flex items-baseline gap-1.5 text-[12px]">
                    <span className="font-medium text-ink">{who}</span>
                    <span className="text-faint">{did}</span>
                    <span className="truncate text-muted">{what}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-line bg-panel-solid p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Evaluation throughput
              </p>
              <MiniWave seed="org-activity" color="var(--accent)" bars={30} className="mt-2 h-10 w-full" />
              <p className="tnum mt-1 text-[11px] text-muted">42 K evaluations · 4.2 TB stored</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
