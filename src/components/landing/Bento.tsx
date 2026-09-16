import { MiniWave } from "@/components/landing/MiniWave";

/**
 * Asymmetric feature grid. Each tile carries a working miniature of the thing it
 * describes rather than an icon, so the grid reads as product rather than copy.
 */
export function BentoGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Tile className="lg:col-span-2 lg:row-span-2">
        <Kicker>Controlled listening studies</Kicker>
        <Title>A/B comparison, blind trials, synchronised playback</Title>
        <Body>
          Design structured human evaluation: solo playback so two clips never overlap, a shared
          playhead so switching models lands on the same word, and randomised trial order drawn
          from a stored seed.
        </Body>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {["Reference", "Model A"].map((label, index) => (
            <div key={label} className="rounded-2xl border border-line bg-panel-solid/70 p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-ink">{label}</span>
                <span className="tnum font-mono text-faint">00:0{index === 0 ? 8 : 7}.4</span>
              </div>
              <MiniWave
                seed={`bento-${label}`}
                color={index === 0 ? "var(--teal)" : "var(--accent)"}
                bars={40}
                className="mt-2 h-9 w-full"
              />
            </div>
          ))}
        </div>
      </Tile>

      <Tile>
        <Kicker>Blind evaluation</Kicker>
        <Title>Identity stays server-side</Title>
        <Body>
          Evaluators see letters. The mapping back to a model version never leaves the server.
        </Body>
        <ul className="mt-4 space-y-2">
          {["A", "B", "C"].map((label) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-xl border border-line bg-panel-solid/70 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-ink">Model {label}</span>
              <span className="font-mono text-faint">?</span>
            </li>
          ))}
        </ul>
      </Tile>

      <Tile>
        <Kicker>Model analytics</Kicker>
        <Title>Distributions, not just averages</Title>
        <div className="mt-4 space-y-2.5">
          {[
            { name: "XEUS v1.2", value: 4.62 },
            { name: "Whisper L", value: 4.31 },
            { name: "data2vec", value: 3.88 },
          ].map((row) => (
            <div key={row.name} className="flex items-center gap-2.5">
              <span className="w-20 shrink-0 truncate text-[11px] text-muted">{row.name}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(row.value / 5) * 100}%` }}
                />
              </span>
              <span className="tnum w-8 text-right text-[11px] font-semibold text-ink">
                {row.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </Tile>

      <Tile className="lg:col-span-2">
        <Kicker>Experiment provenance</Kicker>
        <Title>Every result traces back to what produced it</Title>
        <Body>
          A score is never an orphan number. It resolves to a trial, a session, a rubric version, a
          sample, an audio checksum, a model version and a checkpoint.
        </Body>
        <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 font-mono text-[11px]">
          {[
            "Dataset v3",
            "Experiment #042",
            "XEUS v1.2",
            "checkpoint a82f91c",
            "rubric v2",
            "Result #2841",
          ].map((step, index, all) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="rounded-lg border border-line bg-panel-solid px-2 py-1 text-ink">
                {step}
              </span>
              {index < all.length - 1 ? (
                <span className="text-accent" aria-hidden="true">
                  →
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </Tile>

      <Tile>
        <Kicker>Audio pipeline</Kicker>
        <Title>Validated on the way in</Title>
        <ul className="mt-3.5 space-y-1.5 text-[12px]">
          {[
            ["Sample rate", "16 000 Hz"],
            ["Channels", "Mono"],
            ["Bit depth", "16-bit"],
            ["Clipping", "None"],
            ["SHA-256", "24684cfe…"],
          ].map(([label, value]) => (
            <li key={label} className="flex items-center justify-between gap-2">
              <span className="text-muted">{label}</span>
              <span className="flex items-center gap-1.5 font-mono text-ink">
                {value}
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="var(--teal)"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </li>
          ))}
        </ul>
      </Tile>
    </div>
  );
}

function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={`panel sweep rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-line-strong sm:p-6 ${className ?? ""}`}
    >
      {children}
    </article>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{children}</p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-ink">{children}</h3>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>;
}
