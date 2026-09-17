"use client";

import { useMemo, useState } from "react";

import { ScoreRow } from "@/components/Rating";
import { SignInNotice } from "@/components/SignIn";
import { cx } from "@/lib/format";
import { accentFor } from "@/lib/palette";
import { useListenerStore } from "@/store/listener";

interface CellData {
  model: { id: string; name: string; version: string };
  sample: { id: string; durationSec: number | null; sampleRate: number | null } | null;
  rating: { naturalness: number | null; similarity: number | null } | null;
}

interface RowData {
  item: { id: string; label: string; transcript: string | null };
  source: { id: string } | null;
  target: { id: string } | null;
  cells: CellData[];
}

export interface WorkspaceRatingBoardProps {
  collectionId: string;
  models: Array<{ id: string; name: string; version: string }>;
  rows: RowData[];
}

type LocalScores = Record<string, { naturalness: number | null; similarity: number | null }>;

function cellKey(itemId: string, modelId: string): string {
  return `${itemId}:${modelId}`;
}

/**
 * The member's rating surface for one admin-created folder: every row is an
 * utterance, every column a model, and each rated cell shows two scores. Only
 * cells that actually have an uploaded clip can be rated; an empty column
 * shows "not uploaded yet" instead of a dead control.
 */
export function WorkspaceRatingBoard({ collectionId, models, rows }: WorkspaceRatingBoardProps) {
  const listener = useListenerStore((state) => state.listener);

  const [scores, setScores] = useState<LocalScores>(() => {
    const initial: LocalScores = {};
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.rating) {
          initial[cellKey(row.item.id, cell.model.id)] = {
            naturalness: cell.rating.naturalness,
            similarity: cell.rating.similarity,
          };
        }
      }
    }
    return initial;
  });
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(rows[0]?.item.id ?? null);

  const totalCells = useMemo(
    () => rows.reduce((sum, row) => sum + row.cells.filter((c) => c.sample).length, 0),
    [rows],
  );
  const doneCells = useMemo(
    () =>
      Object.values(scores).filter((s) => s.naturalness !== null || s.similarity !== null).length,
    [scores],
  );

  async function rate(
    itemId: string,
    modelId: string,
    field: "naturalness" | "similarity",
    value: number,
  ) {
    if (!listener) return;
    const key = cellKey(itemId, modelId);
    const current = scores[key] ?? { naturalness: null, similarity: null };
    // Clicking the selected star again clears that score, matching the pair pages.
    const nextValue = current[field] === value ? null : value;
    const next = { ...current, [field]: nextValue };

    setScores((state) => ({ ...state, [key]: next }));
    setPending(key);
    try {
      await fetch("/api/v1/workspace-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId,
          itemId,
          modelId,
          naturalness: next.naturalness,
          similarity: next.similarity,
        }),
      });
    } catch {
      // Left in local state; nothing else to do without a retry queue here.
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <SignInNotice />

      <div className="panel flex flex-wrap items-center gap-4 rounded-2xl p-4">
        <div className="min-w-0 flex-1">
          <p className="tnum text-lg font-semibold text-ink">
            {doneCells} of {totalCells}
            <span className="ml-2 text-sm font-normal text-muted">cells scored</span>
          </p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken">
            <span
              className={cx(
                "block h-full rounded-full transition-[width] duration-500",
                doneCells >= totalCells && totalCells > 0 ? "bg-teal" : "bg-accent",
              )}
              style={{ width: `${totalCells ? (doneCells / totalCells) * 100 : 0}%` }}
            />
          </span>
        </div>
        {doneCells >= totalCells && totalCells > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-xl border border-teal/40 bg-teal-soft px-4 py-2 text-sm font-medium text-teal">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All done here
          </span>
        ) : null}
      </div>

      <ol className="space-y-3">
        {rows.map((row) => {
          const open = expanded === row.item.id;
          const rowDone = row.cells.filter((cell) => {
            const s = scores[cellKey(row.item.id, cell.model.id)];
            return cell.sample && s && (s.naturalness !== null || s.similarity !== null);
          }).length;
          const rowTotal = row.cells.filter((cell) => cell.sample).length;
          const rowComplete = rowTotal > 0 && rowDone >= rowTotal;

          return (
            <li key={row.item.id} className="panel overflow-hidden rounded-2xl">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : row.item.id)}
                aria-expanded={open}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={cx(
                    "tnum shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    rowComplete
                      ? "bg-teal-soft text-teal"
                      : rowDone > 0
                        ? "bg-accent-soft text-accent"
                        : "bg-sunken text-faint",
                  )}
                >
                  {rowDone}/{rowTotal}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink" dir="auto">
                  {row.item.label}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className={cx("shrink-0 text-faint transition-transform", open && "rotate-180")}
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {open ? (
                <div className="space-y-3 border-t border-line/70 px-4 py-4">
                  {row.item.transcript ? (
                    <p dir="auto" className="arabic text-[15px] text-muted">
                      {row.item.transcript}
                    </p>
                  ) : null}

                  {row.source ? <ReferenceRow label="Source" sampleId={row.source.id} /> : null}
                  {row.target ? <ReferenceRow label="Target" sampleId={row.target.id} /> : null}

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {row.cells.map((cell) => {
                      const key = cellKey(row.item.id, cell.model.id);
                      const local = scores[key] ?? { naturalness: null, similarity: null };
                      const accent = accentFor(cell.model.name, models.indexOf(cell.model));
                      const busy = pending === key;

                      return (
                        <div
                          key={cell.model.id}
                          className="rounded-xl border border-line bg-panel-solid/70 p-3"
                          style={{ borderTopColor: accent, borderTopWidth: 3 }}
                        >
                          <p className="truncate text-[13px] font-semibold text-ink">
                            {cell.model.name}
                            <span className="ml-1.5 font-mono text-[10px] font-normal text-faint">
                              {cell.model.version}
                            </span>
                          </p>

                          {cell.sample ? (
                            <>
                              <audio
                                src={`/api/v1/samples/${cell.sample.id}/audio`}
                                controls
                                preload="none"
                                className="mt-2 h-9 w-full"
                              />
                              <div
                                className={cx(
                                  "mt-2.5 flex flex-col gap-1.5",
                                  !listener && "pointer-events-none opacity-50",
                                  busy && "opacity-70",
                                )}
                              >
                                <ScoreRow
                                  field="naturalness"
                                  value={local.naturalness ?? undefined}
                                  onChange={(value) =>
                                    rate(row.item.id, cell.model.id, "naturalness", value)
                                  }
                                  accent={accent}
                                />
                                <ScoreRow
                                  field="similarity"
                                  value={local.similarity ?? undefined}
                                  onChange={(value) =>
                                    rate(row.item.id, cell.model.id, "similarity", value)
                                  }
                                  accent={accent}
                                />
                              </div>
                            </>
                          ) : (
                            <p className="mt-3 rounded-lg border border-dashed border-line px-2.5 py-3 text-center text-[11px] text-faint">
                              Not uploaded yet
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ReferenceRow({ label, sampleId }: { label: string; sampleId: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-sunken/50 px-3 py-2">
      <span className="w-14 shrink-0 text-[11px] font-medium text-faint">{label}</span>
      <audio
        src={`/api/v1/samples/${sampleId}/audio`}
        controls
        preload="none"
        className="h-8 flex-1"
      />
    </div>
  );
}
