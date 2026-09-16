import Link from "next/link";

import { AnalyticsPreview } from "@/components/landing/Analytics";
import { BentoGrid } from "@/components/landing/Bento";
import { EvaluationPreview } from "@/components/landing/EvaluationPreview";
import { Faq } from "@/components/landing/Faq";
import { HeroCanvas } from "@/components/landing/HeroCanvas";
import { LandingNav } from "@/components/landing/LandingNav";
import { LanguageOrbit } from "@/components/landing/Multilingual";
import { OrgControlCenter } from "@/components/landing/OrgCenter";
import { ArchitecturePipeline } from "@/components/landing/Pipeline";
import { Reveal } from "@/components/landing/Reveal";
import { SpectrogramField } from "@/components/landing/Spectrogram";
import { Spotlight } from "@/components/landing/Spotlight";
import { branding, splitWordmark } from "@/config/branding";
import { getBundle } from "@/lib/bundle";

const CAPABILITIES = ["ASR", "TTS", "S2ST", "Voice conversion", "Enhancement", "Multilingual"];

const PILLARS = [
  "Human evaluation",
  "Model benchmarking",
  "Dataset management",
  "Experiment tracking",
  "Reproducible research",
];

const WORKFLOW = [
  ["Create dataset", "Version it, freeze it, and record the license and source."],
  ["Register models", "Every checkpoint becomes its own immutable version."],
  ["Design experiment", "Pick datasets, models, rubric and evaluation protocol."],
  ["Assign evaluators", "Scoped by role; each gets a seeded, reproducible order."],
  ["Run listening study", "Blind trials, A/B comparison, resumable sessions."],
  ["Analyse results", "Distributions, agreement, error analysis, automatic metrics."],
  ["Export report", "Reproducibility package with every version pinned."],
];

const PROVENANCE = [
  ["Dataset", "Kannada-Test v3"],
  ["Model", "XEUS v1.2"],
  ["Checkpoint", "a82f91c"],
  ["Inference", "temperature 0.7"],
  ["Audio", "16 kHz · mono"],
  ["Rubric", "Naturalness v2"],
  ["Evaluators", "12"],
  ["Seed", "8f3c-21a0"],
];

const SECURITY = [
  "Organization-level access",
  "Role-based permissions checked server-side",
  "Project isolation",
  "Full audit trail",
  "Controlled exports",
  "Self-hosted deployment",
];

export default async function LandingPage() {
  const { stats } = await getBundle();
  const [wordmarkHead, wordmarkTail] = splitWordmark(branding.name);

  return (
    <div className="ses-landing -mx-4 -mt-6 px-4 pb-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* ---------------------------------------------------------- hero -- */}
      <LandingNav studioHref="/start" />

      <section className="ses-grid ses-grid-fade relative -mx-4 overflow-hidden px-4 pb-24 pt-16 sm:-mx-6 sm:px-6 sm:pt-24 lg:-mx-8 lg:px-8">
        {/* Waves sit low and faint: texture under the fold, never behind the type. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 opacity-60">
          <HeroCanvas showGraph={false} />
        </div>

        <div className="relative mx-auto max-w-[52rem] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-solid px-3.5 py-1.5 text-[12px] font-medium text-muted shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {branding.tagline}
          </span>

          <h1 className="mt-8 text-[clamp(2.75rem,7.2vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-ink">
            Listen to your models.
            <br />
            <span className="ses-gradient-text">Prove what you hear.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-[38rem] text-[clamp(1rem,1.6vw,1.25rem)] leading-relaxed text-muted">
            {branding.description}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/start"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
              style={{ background: "var(--primary-to)" }}
            >
              Open the studio
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel-solid px-7 py-3.5 text-[15px] font-semibold text-ink shadow-sm transition-colors hover:border-line-strong"
            >
              See how it works
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </div>

        <div className="relative mt-20">
          <EvaluationPreview />
        </div>
      </section>

      {/* -------------------------------------------------------- trust -- */}
      <Reveal>
        <section className="mt-16 border-y border-line py-7">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
            Built for serious speech research
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {CAPABILITIES.map((capability) => (
              <li
                key={capability}
                className="text-sm font-semibold tracking-tight text-ink/70 transition-colors hover:text-accent"
              >
                {capability}
              </li>
            ))}
          </ul>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {PILLARS.map((pillar) => (
              <li
                key={pillar}
                className="rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted backdrop-blur"
              >
                {pillar}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {/* ------------------------------------------------------ problem -- */}
      <Reveal>
        <section className="mt-24 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Kicker>The measurement problem</Kicker>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-[2.6rem] sm:leading-[1.1]">
              Speech quality is not one metric.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              WER can tell you <span className="text-ink">what</span> was recognised. It cannot tell
              you <span className="text-ink">how it sounded</span> — whether the speaker survived,
              whether the prosody held, whether a listener would accept it.
            </p>
            <div className="mt-7 space-y-2 font-mono text-[13px] text-muted">
              {["Human perception", "Automatic metrics", "Experiment metadata"].map((line) => (
                <p key={line} className="flex items-center gap-2">
                  <span className="text-accent">+</span>
                  {line}
                </p>
              ))}
              <p className="flex items-center gap-2 border-t border-line pt-2 font-semibold text-ink">
                <span className="text-accent">=</span>
                Reproducible evaluation
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Naturalness", 4.6],
              ["Speaker similarity", 4.3],
              ["Prosody", 4.1],
              ["Pronunciation", 4.7],
            ].map(([label, value], index) => (
              <Reveal key={label as string} delay={index * 80}>
                <div className="panel sweep rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="tnum mt-1 text-3xl font-semibold tracking-tight text-ink">
                    {(value as number).toFixed(1)}
                    <span className="text-base font-normal text-faint"> / 5</span>
                  </p>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-sunken">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${((value as number) / 5) * 100}%` }}
                    />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ------------------------------------------------- architecture -- */}
      <Reveal>
        <section id="how-it-works" className="mt-24 scroll-mt-24">
          <SectionIntro
            index="01" kicker="Platform architecture"
            title="From audio files to research evidence."
            body="Seven stages, each one a versioned entity in the database. Hover any stage to see what it pins down."
          />
          <Spotlight className="mt-8 rounded-3xl">
            <ArchitecturePipeline />
          </Spotlight>
        </section>
      </Reveal>

      {/* -------------------------------------------------------- bento -- */}
      <Reveal>
        <section id="capabilities" className="mt-24 scroll-mt-24">
          <SectionIntro
            index="02" kicker="Capabilities"
            title="Everything a listening study needs, connected."
            body="Not a set of disconnected screens — one object graph from dataset to report."
          />
          <div className="mt-8">
            <BentoGrid />
          </div>
        </section>
      </Reveal>

      {/* --------------------------------------------------- spectrogram -- */}
      <Reveal>
        <section className="mt-24 rounded-3xl border border-line bg-panel px-5 py-10 backdrop-blur sm:px-8">
          <SectionIntro
            index="03" kicker="Signal"
            title="Hear the difference. See the signal."
            body="Waveform, spectrogram and transport share one timeline, so what you hear and what you see line up."
          />
          <div className="mt-8">
            <SpectrogramField height={200} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["Reference", "Model A", "Model B"].map((label, index) => (
              <div key={label} className="rounded-2xl border border-line bg-panel-solid p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{label}</span>
                  <span className="tnum font-mono text-faint">
                    {(8.4 - index * 0.3).toFixed(1)}s
                  </span>
                </div>
                <SpectrogramField height={52} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-faint">
            Peaks are precomputed server-side and cached, so a long clip opens instantly instead of
            being decoded in the browser every time.
          </p>
        </section>
      </Reveal>

      {/* ----------------------------------------------------- workflow -- */}
      <Reveal>
        <section className="mt-24">
          <SectionIntro
            index="04" kicker="Workflow"
            title="One path from experiment design to publication."
            body="Each step writes provenance, so the last step can always reconstruct the first."
          />
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map(([title, body], index) => (
              <Reveal key={title} delay={index * 70}>
                <li className="panel sweep h-full rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-1.5">
                  <span className="tnum font-mono text-[11px] text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1.5 text-[15px] font-semibold tracking-tight text-ink">
                    {title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* ------------------------------------------------ organization -- */}
      <Reveal>
        <section className="mt-24">
          <SectionIntro
            index="05" kicker="Administration"
            title="One control centre for the whole lab."
            body="Members, teams, projects, storage and an audit trail of every action that touched research data."
          />
          <Spotlight className="mt-8 rounded-3xl">
            <OrgControlCenter />
          </Spotlight>
        </section>
      </Reveal>

      {/* ------------------------------------------------- multilingual -- */}
      <Reveal>
        <section className="mt-24 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Kicker>Multilingual by design</Kicker>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.12]">
              Built for the languages you actually work on.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-muted">
              Source language, target language, locale and script are first-class fields on every
              sample. Transcripts render in their own writing system and direction — right-to-left
              included — instead of being forced into Latin assumptions.
            </p>
            <p className="mt-5 font-mono text-[13px] text-muted">
              ASR · TTS · S2ST · Voice conversion
            </p>
          </div>
          <LanguageOrbit />
        </section>
      </Reveal>

      {/* ---------------------------------------------------- analytics -- */}
      <Reveal>
        <section id="analytics" className="mt-24 scroll-mt-24">
          <SectionIntro
            index="06" kicker="Analytics"
            title="Turn human perception into measurable evidence."
            body="Means are the beginning, not the answer: distributions, confidence intervals, agreement and effect sizes, computed server-side."
          />
          <div className="mt-8">
            <AnalyticsPreview />
          </div>
        </section>
      </Reveal>

      {/* ------------------------------------------------ reproducibility -- */}
      <Reveal>
        <section className="mt-24 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <Kicker>Reproducibility</Kicker>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.12]">
              Every result has a history.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-muted">
              Completed experiments are immutable. Changing a dataset, a rubric or a model creates a
              new version rather than rewriting what was already published — so a number in a paper
              still resolves to the run that produced it a year later.
            </p>
            <Link
              href="/data"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-medium text-ink backdrop-blur transition-colors hover:border-line-strong"
            >
              Inspect bundle provenance
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="panel rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <p className="font-mono text-[13px] font-semibold text-ink">RESULT #2841</p>
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                immutable
              </span>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {PROVENANCE.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[11px] uppercase tracking-wider text-faint">{label}</dt>
                  <dd className="truncate font-mono text-[12px] text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </Reveal>

      {/* ----------------------------------------------------- security -- */}
      <Reveal>
        <section className="mt-24 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="panel rounded-3xl p-6">
            <ul className="space-y-2.5">
              {SECURITY.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.8"
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Kicker>Private research</Kicker>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.12]">
              Your research stays yours.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-muted">
              Runs on your own infrastructure — Postgres, Redis and object storage you control.
              Authorisation is enforced on the server for every action, never by hiding a button.
            </p>
          </div>
        </section>
      </Reveal>

      {/* ---------------------------------------------------------- faq -- */}
      <Reveal>
        <section id="faq" className="mt-24 scroll-mt-24">
          <SectionIntro
            index="07"
            kicker="Questions"
            title="How it actually works."
            body="The decisions behind the architecture, in plain terms."
          />
          <div className="mt-8">
            <Faq />
          </div>
        </section>
      </Reveal>

      {/* ---------------------------------------------------------- cta -- */}
      <Reveal>
        <section className="ses-grid relative mt-24 overflow-hidden rounded-3xl border border-line bg-panel px-6 py-16 text-center backdrop-blur sm:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 120% at 50% 0%, color-mix(in oklab, var(--primary-from) 26%, transparent), transparent 70%)",
            }}
          />
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-[2.75rem] sm:leading-[1.1]">
            Build better speech systems
            <br />
            by listening to them.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-muted">
            Design experiments. Run evaluations. Understand your models.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/start"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
              style={{ background: "var(--primary-to)" }}
            >
              Open the studio
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-line bg-panel-solid px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-line-strong"
            >
              Go to admin
            </Link>
          </div>
          <p className="tnum mt-8 font-mono text-[11px] text-faint">
            This deployment currently serves {stats.pairs} pairs · {stats.models} models ·{" "}
            {stats.clips} clips at 16 kHz
          </p>
        </section>
      </Reveal>

      {/* ------------------------------------------------------- footer -- */}
      <footer className="mt-16 grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm font-semibold tracking-tight text-ink">
            {wordmarkHead} <span className="font-normal text-muted">{wordmarkTail}</span>
          </p>
          <p className="mt-1 text-xs text-faint">{branding.tagline}</p>
        </div>

        {[
          ["Platform", [["Pairs", "/pairs"], ["Blind test", "/blind-test"], ["My scores", "/results"]]],
          ["Research", [["Everyone's ratings", "/admin"], ["Bundle data", "/data"]]],
          ["Organization", [["Documentation", branding.docsUrl]]],
        ].map(([heading, links]) => (
          <div key={heading as string}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
              {heading as string}
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {(links as Array<[string, string]>).map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-muted transition-colors hover:text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="text-xs text-faint sm:col-span-2 lg:col-span-4">
          © {new Date().getFullYear()} {branding.organization} · {branding.name}
        </p>
      </footer>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">{children}</p>
  );
}

function SectionIntro({
  index,
  kicker,
  title,
  body,
}: {
  index?: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Kicker>
        {index ? <span className="mr-1.5 font-mono text-faint">[{index}]</span> : null}
        {kicker}
      </Kicker>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.12]">
        {title}
      </h2>
      <p className="mt-3.5 text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
