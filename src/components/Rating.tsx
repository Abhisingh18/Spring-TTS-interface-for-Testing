"use client";

import { useEffect, useState } from "react";

import { cx } from "@/lib/format";
import { useRatingsStore, type RatingField } from "@/store/ratings";

const SCALE = [1, 2, 3, 4, 5] as const;

const FIELD_LABEL: Record<RatingField, { short: string; help: string }> = {
  naturalness: {
    short: "Natural",
    help: "How clean and human it sounds · 1 = heavy artefacts, 5 = natural speech",
  },
  similarity: {
    short: "Speaker",
    help: "How close the voice is to the target · 1 = different person, 5 = same voice",
  },
};

export function ScoreRow({
  field,
  value,
  onChange,
  accent,
}: {
  field: RatingField;
  value: number | undefined;
  onChange: (score: number) => void;
  accent?: string;
}) {
  const meta = FIELD_LABEL[field];
  const [hovered, setHovered] = useState<number | null>(null);
  const preview = hovered ?? value;

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-[3.4rem] shrink-0 cursor-help text-[11px] font-medium text-faint"
        title={meta.help}
      >
        {meta.short}
      </span>
      <div
        className="flex gap-1"
        role="group"
        aria-label={meta.short}
        onMouseLeave={() => setHovered(null)}
      >
        {SCALE.map((score) => {
          const filled = preview !== undefined && preview !== null && score <= preview;
          const isHoverPreview = hovered !== null && value !== hovered;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              onMouseEnter={() => setHovered(score)}
              aria-label={`${meta.short} ${score} of 5`}
              aria-pressed={value === score}
              className={cx(
                "h-[22px] w-[22px] rounded-lg border text-[10px] font-semibold transition-all duration-150",
                "hover:-translate-y-0.5 active:translate-y-0 active:scale-95",
                filled
                  ? "border-transparent shadow-sm"
                  : "border-line text-faint hover:border-line-strong hover:text-muted",
              )}
              style={
                filled
                  ? {
                      background: accent ?? "var(--accent)",
                      color: "var(--bg)",
                      opacity: isHoverPreview ? 0.65 : 1,
                    }
                  : undefined
              }
            >
              {score}
            </button>
          );
        })}
      </div>
      <span
        className={cx(
          "tnum text-[11px] transition-colors",
          value !== undefined ? "text-muted" : "text-faint/50",
        )}
      >
        {value !== undefined ? `${value}/5` : "–"}
      </span>
    </div>
  );
}

/** Rating widget wired to the persisted store, used on the pair pages. */
export function PairRating({
  pairSlug,
  modelKey,
  accent,
}: {
  pairSlug: string;
  modelKey: string;
  accent?: string;
}) {
  const rating = useRatingsStore((state) => state.ratings[pairSlug]?.[modelKey]);
  const rate = useRatingsStore((state) => state.rate);
  const [hydrated, setHydrated] = useState(false);

  // The store rehydrates from localStorage after mount; render empty until then
  // so server and client markup agree.
  useEffect(() => setHydrated(true), []);

  return (
    <div className="flex flex-col gap-2">
      <ScoreRow
        field="naturalness"
        value={hydrated ? rating?.naturalness : undefined}
        onChange={(score) => rate(pairSlug, modelKey, "naturalness", score)}
        accent={accent}
      />
      <ScoreRow
        field="similarity"
        value={hydrated ? rating?.similarity : undefined}
        onChange={(score) => rate(pairSlug, modelKey, "similarity", score)}
        accent={accent}
      />
    </div>
  );
}
