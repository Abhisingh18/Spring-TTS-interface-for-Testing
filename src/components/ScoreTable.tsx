"use client";

import { accentFor } from "@/lib/palette";
import type { ModelSummary } from "@/lib/results";

/** Ranked mean scores with an inline bar for the overall column. */
export function ScoreTable({
  rows,
  emptyMessage = "Nothing scored yet.",
}: {
  rows: ModelSummary[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="panel rounded-2xl px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="panel overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
            <th className="px-4 py-2.5 font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Model</th>
            <th className="px-4 py-2.5 text-right font-medium">Natural</th>
            <th className="px-4 py-2.5 text-right font-medium">Speaker</th>
            <th className="px-4 py-2.5 font-medium">Overall</th>
            <th className="px-4 py-2.5 text-right font-medium">n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, position) => {
            const accent = accentFor(row.modelLabel.split("(")[0]?.trim() ?? "", position);
            return (
              <tr key={row.modelKey} className="border-b border-line/60 last:border-0">
                <td className="tnum px-4 py-2.5 font-mono text-[11px] text-faint">
                  {position + 1}
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: accent }}
                      aria-hidden="true"
                    />
                    {row.modelLabel}
                  </span>
                </td>
                <td className="tnum px-4 py-2.5 text-right text-muted">
                  {format(row.naturalness)}
                </td>
                <td className="tnum px-4 py-2.5 text-right text-muted">{format(row.similarity)}</td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-28 overflow-hidden rounded-full bg-sunken">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${((row.overall ?? 0) / 5) * 100}%`,
                          background: accent,
                        }}
                      />
                    </span>
                    <span className="tnum text-xs font-semibold text-ink">
                      {format(row.overall)}
                    </span>
                  </span>
                </td>
                <td className="tnum px-4 py-2.5 text-right text-xs text-faint">{row.count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function format(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}
