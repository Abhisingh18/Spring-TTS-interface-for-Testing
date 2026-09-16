"use client";

import { useEffect, useMemo, useState } from "react";

import { ClipPlayer } from "@/components/ClipPlayer";
import { ScoreRow } from "@/components/Rating";
import { ScoreTable } from "@/components/ScoreTable";
import { Badge, KeyCap, SectionHeading } from "@/components/ui";
import { cx } from "@/lib/format";
import { REFERENCE_ACCENT } from "@/lib/palette";
import { summariseBlind } from "@/lib/results";
import type { Clip, ModelInfo, Pair } from "@/lib/types";
import { controlsFor, usePlayerStore } from "@/store/player";
import { useRatingsStore, type BlindTrialResult } from "@/store/ratings";

interface Trial {
  pair: Pair;
  clip: Clip;
  model: ModelInfo | undefined;
}

const LENGTHS = [10, 20, 40] as const;

export function BlindTest({ pairs, models }: { pairs: Pair[]; models: ModelInfo[] }) {
  const [trials, setTrials] = useState<Trial[] | null>(null);
  const [index, setIndex] = useState(0);
  const [naturalness, setNaturalness] = useState<number | undefined>();
  const [similarity, setSimilarity] = useState<number | undefined>();
  const [sessionResults, setSessionResults] = useState<BlindTrialResult[]>([]);

  const recordBlind = useRatingsStore((state) => state.recordBlind);
  const modelMeta = useMemo(() => new Map(models.map((model) => [model.key, model])), [models]);

  const current = trials?.[index];

  // Same transport keys as the pair pages, scoped to the three clips on screen.
  useEffect(() => {
    if (!current) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!current || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      const clipId =
        event.key === "q"
          ? current.pair.source.id
          : event.key === "w"
            ? current.pair.target.id
            : event.key === "1"
              ? current.clip.id
              : null;

      if (clipId) {
        event.preventDefault();
        controlsFor(clipId)?.toggle();
        return;
      }

      const { activeId } = usePlayerStore.getState();
      const active = activeId ? controlsFor(activeId) : undefined;
      if (!active) return;
      if (event.key === " ") {
        event.preventDefault();
        active.toggle();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        active.seekBy(-2);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        active.seekBy(2);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current]);

  function start(length: number) {
    const combos: Trial[] = pairs.flatMap((pair) =>
      pair.models.map((clip) => ({ pair, clip, model: modelMeta.get(clip.key) })),
    );
    setTrials(shuffle(combos).slice(0, Math.min(length, combos.length)));
    setIndex(0);
    setNaturalness(undefined);
    setSimilarity(undefined);
    setSessionResults([]);
  }

  function submit(trial: Trial) {
    if (naturalness === undefined || similarity === undefined) return;
    const result: BlindTrialResult = {
      pairSlug: trial.pair.slug,
      pairName: trial.pair.name,
      modelKey: trial.clip.key,
      modelLabel: trial.model?.label ?? trial.clip.label,
      naturalness,
      similarity,
      answeredAt: Date.now(),
    };
    recordBlind(result);
    setSessionResults((current) => [...current, result]);
    setNaturalness(undefined);
    setSimilarity(undefined);
    setIndex((current) => current + 1);
  }

  if (!trials) {
    return (
      <div className="panel mx-auto max-w-2xl rounded-2xl p-6">
        <Badge tone="accent">Blind evaluation</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Score the models without knowing which is which
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Each trial shows the pair&rsquo;s two references and one unlabelled converted clip drawn at
          random from all {pairs.length} pairs × {models.length} models. Rate how natural it sounds
          and how close the voice is to the target. Names are revealed only in the summary at the
          end.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {LENGTHS.map((length) => (
            <button
              key={length}
              type="button"
              onClick={() => start(length)}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              {length} trials
            </button>
          ))}
          <button
            type="button"
            onClick={() => start(pairs.length * models.length)}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Full sweep · {pairs.length * models.length} trials
          </button>
        </div>
        <p className="mt-4 text-xs text-faint">
          Answers are stored in this browser only. The Results page merges them with your labelled
          scores and exports both as CSV.
        </p>
      </div>
    );
  }

  const trial = current;

  if (!trial) {
    const summary = summariseBlind(sessionResults);
    return (
      <div className="space-y-6">
        <SectionHeading
          title="Blind session complete"
          description={`${sessionResults.length} trials scored. Mean scores across the models you happened to draw.`}
          actions={
            <button
              type="button"
              onClick={() => setTrials(null)}
              className="rounded-xl border border-line px-3.5 py-2 text-sm text-ink transition-colors hover:border-line-strong"
            >
              New session
            </button>
          }
        />
        <ScoreTable rows={summary} emptyMessage="No trials were scored." />
        <ol className="panel divide-y divide-line rounded-2xl text-sm">
          {sessionResults.map((result, position) => (
            <li key={`${result.modelKey}-${result.answeredAt}`} className="flex items-center gap-3 px-4 py-2">
              <span className="tnum w-6 font-mono text-[11px] text-faint">{position + 1}</span>
              <span className="w-24 shrink-0 text-xs text-muted">{result.pairName}</span>
              <span className="font-medium text-ink">{result.modelLabel}</span>
              <span className="tnum ml-auto text-xs text-muted">
                natural {result.naturalness} · speaker {result.similarity}
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const progress = (index / trials.length) * 100;
  const ready = naturalness !== undefined && similarity !== undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="tnum">
            Trial {index + 1} of {trials.length}
          </span>
          <button
            type="button"
            onClick={() => setTrials(null)}
            className="text-faint transition-colors hover:text-ink"
          >
            End session
          </button>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="panel rounded-2xl p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          References · pair {trial.pair.name}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ClipPlayer
            key={`${trial.pair.slug}-source`}
            clip={trial.pair.source}
            accent={REFERENCE_ACCENT.source}
            hotkey="Q"
            compact
            eager
          />
          <ClipPlayer
            key={`${trial.pair.slug}-target`}
            clip={trial.pair.target}
            accent={REFERENCE_ACCENT.target}
            hotkey="W"
            compact
            eager
          />
        </div>
        <p dir="auto" className="arabic mt-3 border-t border-line pt-3 text-[15px] text-muted">
          {trial.pair.sourceText}
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Unlabelled conversion
        </h2>
        <ClipPlayer
          key={`${trial.pair.slug}-${trial.clip.key}`}
          clip={trial.clip}
          accent="var(--accent)"
          displayLabel={`Sample ${index + 1}`}
          displaySubtitle="Model hidden until the summary"
          referenceDuration={trial.pair.source.durationSeconds}
          eager
        />
      </div>

      <div className="panel flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl px-4 py-3.5">
        <ScoreRow field="naturalness" value={naturalness} onChange={setNaturalness} />
        <ScoreRow field="similarity" value={similarity} onChange={setSimilarity} />
        <button
          type="button"
          disabled={!ready}
          onClick={() => submit(trial)}
          className={cx(
            "ml-auto rounded-xl px-4 py-2 text-sm font-semibold transition-opacity",
            ready ? "bg-accent text-bg hover:opacity-90" : "cursor-not-allowed bg-sunken text-faint",
          )}
        >
          {index + 1 === trials.length ? "Finish" : "Next trial"}
        </button>
      </div>

      <p className="text-center text-xs text-faint">
        <KeyCap>Q</KeyCap> source · <KeyCap>W</KeyCap> target · <KeyCap>1</KeyCap> unlabelled clip
      </p>
    </div>
  );
}

/** Fisher–Yates; runs on click so server and client markup never disagree. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}
