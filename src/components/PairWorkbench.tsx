"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ClipPlayer } from "@/components/ClipPlayer";
import { PairRating } from "@/components/Rating";
import { SignInNotice } from "@/components/SignIn";
import { SectionHeading } from "@/components/ui";
import { cx } from "@/lib/format";
import { accentFor, REFERENCE_ACCENT } from "@/lib/palette";
import type { ModelInfo, Pair } from "@/lib/types";
import { controlsFor, usePlayerStore } from "@/store/player";
import { useRatingsStore } from "@/store/ratings";

type SortMode = "bundle" | "length" | "rated";

const MODEL_HOTKEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function PairWorkbench({
  pair,
  models,
  prevSlug,
  nextSlug,
}: {
  pair: Pair;
  models: ModelInfo[];
  prevSlug?: string;
  nextSlug?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortMode>("bundle");
  const [families, setFamilies] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [compact, setCompact] = useState(false);
  const ratings = useRatingsStore((state) => state.ratings[pair.slug]);

  const modelMeta = useMemo(
    () => new Map(models.map((model) => [model.key, model])),
    [models],
  );

  const allFamilies = useMemo(
    () => [...new Set(models.map((model) => model.family))],
    [models],
  );

  const orderedModels = useMemo(() => {
    // Keep the bundle order as the identity mapping for hotkeys and labels.
    const withMeta = pair.models.map((clip, index) => ({
      clip,
      meta: modelMeta.get(clip.key),
      bundleIndex: index,
    }));

    const filtered =
      families.length === 0
        ? withMeta
        : withMeta.filter((entry) => entry.meta && families.includes(entry.meta.family));

    const sorted = [...filtered];
    if (sort === "length") {
      sorted.sort(
        (a, b) =>
          Math.abs(a.clip.durationSeconds - pair.source.durationSeconds) -
          Math.abs(b.clip.durationSeconds - pair.source.durationSeconds),
      );
    } else if (sort === "rated") {
      const score = (key: string) => {
        const rating = ratings?.[key];
        if (!rating) return -1;
        const parts = [rating.naturalness, rating.similarity].filter(
          (value): value is number => value !== undefined,
        );
        return parts.length ? parts.reduce((sum, value) => sum + value, 0) / parts.length : -1;
      };
      sorted.sort((a, b) => score(b.clip.key) - score(a.clip.key));
    }
    return sorted;
  }, [families, modelMeta, pair.models, pair.source.durationSeconds, ratings, sort]);

  // Pair-scoped keyboard control. Digits follow the bundle order, not the
  // current sort, so a model keeps the same key while you re-sort.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }

      const { activeId, loop, setLoop, keepPosition, setKeepPosition } = usePlayerStore.getState();
      const active = activeId ? controlsFor(activeId) : undefined;

      const digit = MODEL_HOTKEYS.indexOf(event.key);
      if (digit !== -1) {
        const clip = pair.models[digit];
        if (clip) {
          event.preventDefault();
          controlsFor(clip.id)?.toggle();
        }
        return;
      }

      switch (event.key) {
        case "q":
          event.preventDefault();
          controlsFor(pair.source.id)?.toggle();
          break;
        case "w":
          event.preventDefault();
          controlsFor(pair.target.id)?.toggle();
          break;
        case " ":
          if (active) {
            event.preventDefault();
            active.toggle();
          }
          break;
        case "ArrowLeft":
          if (active) {
            event.preventDefault();
            active.seekBy(-2);
          }
          break;
        case "ArrowRight":
          if (active) {
            event.preventDefault();
            active.seekBy(2);
          }
          break;
        case "r":
          active?.restart();
          break;
        case "l":
          setLoop(!loop);
          break;
        case "k":
          setKeepPosition(!keepPosition);
          break;
        case "[":
          if (prevSlug) router.push(`/pairs/${prevSlug}`);
          break;
        case "]":
          if (nextSlug) router.push(`/pairs/${nextSlug}`);
          break;
        default:
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [nextSlug, pair.models, pair.source.id, pair.target.id, prevSlug, router]);

  return (
    <div className="space-y-8">
      <SignInNotice />
      <Toolbar
        sort={sort}
        onSort={setSort}
        families={families}
        allFamilies={allFamilies}
        onFamilies={setFamilies}
        anonymous={anonymous}
        onAnonymous={setAnonymous}
        compact={compact}
        onCompact={setCompact}
      />

      <section>
        <SectionHeading
          step="1"
          tone="teal"
          title="References"
          description="The source carries the words. The target carries the voice. Every model below tries to say the source words in the target voice."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ClipPlayer
            clip={pair.source}
            accent={REFERENCE_ACCENT.source}
            hotkey="Q"
            eager
            referenceDuration={undefined}
          />
          <ClipPlayer
            clip={pair.target}
            accent={REFERENCE_ACCENT.target}
            hotkey="W"
            eager
          />
        </div>
        <Transcripts pair={pair} />
      </section>

      <section>
        <SectionHeading
          step="2"
          title={`Models (${orderedModels.length}/${pair.models.length})`}
          description="Compare the words against the source and the voice against the target. Scores are saved in this browser and can be exported from the Results page."
        />
        <div
          className={cx(
            "grid gap-4",
            compact
              ? "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
              : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
          )}
        >
          {orderedModels.map(({ clip, meta, bundleIndex }) => (
            <ClipPlayer
              key={clip.id}
              clip={clip}
              compact={compact}
              accent={accentFor(meta?.family ?? clip.label, bundleIndex)}
              hotkey={MODEL_HOTKEYS[bundleIndex]}
              displayLabel={anonymous ? `Model ${String.fromCharCode(65 + bundleIndex)}` : undefined}
              displaySubtitle={anonymous ? "Hidden until you turn labels back on" : undefined}
              referenceDuration={pair.source.durationSeconds}
              footer={
                <PairRating
                  pairSlug={pair.slug}
                  modelKey={clip.key}
                  accent={accentFor(meta?.family ?? clip.label, bundleIndex)}
                />
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Toolbar({
  sort,
  onSort,
  families,
  allFamilies,
  onFamilies,
  anonymous,
  onAnonymous,
  compact,
  onCompact,
}: {
  sort: SortMode;
  onSort: (mode: SortMode) => void;
  families: string[];
  allFamilies: string[];
  onFamilies: (families: string[]) => void;
  anonymous: boolean;
  onAnonymous: (value: boolean) => void;
  compact: boolean;
  onCompact: (value: boolean) => void;
}) {
  const rate = usePlayerStore((state) => state.rate);
  const volume = usePlayerStore((state) => state.volume);
  const loop = usePlayerStore((state) => state.loop);
  const solo = usePlayerStore((state) => state.solo);
  const keepPosition = usePlayerStore((state) => state.keepPosition);
  const setRate = usePlayerStore((state) => state.setRate);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setLoop = usePlayerStore((state) => state.setLoop);
  const setSolo = usePlayerStore((state) => state.setSolo);
  const setKeepPosition = usePlayerStore((state) => state.setKeepPosition);

  return (
    <div className="panel sticky top-[102px] z-30 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl px-4 py-2.5">
      <Toggle checked={solo} onChange={setSolo} label="Solo" hint="Starting a clip pauses the others" />
      <Toggle
        checked={keepPosition}
        onChange={setKeepPosition}
        label="Keep position"
        hint="Start the next clip at the same moment (k)"
      />
      <Toggle checked={loop} onChange={setLoop} label="Loop" hint="Repeat the playing clip (l)" />
      <Toggle checked={anonymous} onChange={onAnonymous} label="Hide names" hint="Grade without seeing which model is which" />
      <Toggle checked={compact} onChange={onCompact} label="Dense" hint="Fit more players on screen" />

      <div className="hidden h-5 w-px bg-line md:block" />

      <label className="flex items-center gap-2 text-xs text-muted">
        Speed
        <select
          value={rate}
          onChange={(event) => setRate(Number(event.target.value))}
          className="tnum rounded-md border border-line bg-panel-solid px-1.5 py-1 text-xs text-ink"
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-muted">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          className="w-24"
          aria-label="Playback volume"
        />
      </label>

      <label className="ml-auto flex items-center gap-2 text-xs text-muted">
        Order
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as SortMode)}
          className="rounded-md border border-line bg-panel-solid px-1.5 py-1 text-xs text-ink"
        >
          <option value="bundle">Bundle order</option>
          <option value="length">Closest length to source</option>
          <option value="rated">My score, best first</option>
        </select>
      </label>

      <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-line/60 pt-2">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-faint">Families</span>
        <FamilyChip
          label="All"
          active={families.length === 0}
          onClick={() => onFamilies([])}
        />
        {allFamilies.map((family) => {
          const active = families.includes(family);
          return (
            <FamilyChip
              key={family}
              label={family}
              active={active}
              onClick={() =>
                onFamilies(
                  active ? families.filter((value) => value !== family) : [...families, family],
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function FamilyChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
        active
          ? "border-accent/50 bg-accent-soft text-accent"
          : "border-line text-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      title={hint}
      className="flex items-center gap-2 text-xs text-muted transition-colors hover:text-ink"
    >
      <span
        className={cx(
          "relative h-4 w-7 rounded-full border transition-colors",
          checked ? "border-accent bg-accent-soft" : "border-line bg-sunken",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all",
            checked ? "left-3.5 bg-accent" : "left-0.5 bg-faint",
          )}
        />
      </span>
      <span className={checked ? "font-medium text-ink" : undefined}>{label}</span>
    </button>
  );
}

function Transcripts({ pair }: { pair: Pair }) {
  const [showTarget, setShowTarget] = useState(false);

  return (
    <div className="panel mt-4 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Source transcript · the words every model should reproduce
        </h3>
        <button
          type="button"
          onClick={() => setShowTarget((value) => !value)}
          className="rounded-md border border-line px-2 py-1 text-[11px] text-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          {showTarget ? "Hide target transcript" : "Show target transcript"}
        </button>
      </div>
      <p dir="auto" className="arabic mt-2 text-ink">
        {pair.sourceText}
      </p>
      {showTarget ? (
        <div className="mt-3 border-t border-line pt-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            Target transcript · different words, this is the voice reference
          </h3>
          <p dir="auto" className="arabic mt-2 text-muted">
            {pair.targetText}
          </p>
        </div>
      ) : null}
    </div>
  );
}
