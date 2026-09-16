"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cx, formatBytes, formatKhz } from "@/lib/format";
import type { Clip, Pair } from "@/lib/types";

interface Row extends Clip {
  pairName: string;
  pairSlug: string;
}

type Filter = "all" | "references" | "models" | "resampled";

export function ClipTable({ pairs }: { pairs: Pair[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo<Row[]>(
    () =>
      pairs.flatMap((pair) =>
        [pair.source, pair.target, ...pair.models].map((clip) => ({
          ...clip,
          pairName: pair.name,
          pairSlug: pair.slug,
        })),
      ),
    [pairs],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "references" && row.role === "model") return false;
      if (filter === "models" && row.role !== "model") return false;
      if (filter === "resampled" && !row.resampled) return false;
      if (!needle) return true;
      return (
        row.label.toLowerCase().includes(needle) ||
        row.pairName.toLowerCase().includes(needle) ||
        row.path.toLowerCase().includes(needle) ||
        row.sha256.startsWith(needle)
      );
    });
  }, [filter, query, rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by model, pair, path or sha256…"
          className="min-w-[240px] flex-1 rounded-xl border border-line bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-faint"
          aria-label="Filter clips"
        />
        {(["all", "references", "models", "resampled"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cx(
              "rounded-lg border px-3 py-2 text-xs capitalize transition-colors",
              filter === value
                ? "border-accent/50 bg-accent-soft text-accent"
                : "border-line text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {value}
          </button>
        ))}
        <span className="tnum text-xs text-faint">
          {visible.length} / {rows.length}
        </span>
      </div>

      <div className="panel overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
              <th className="px-4 py-2.5 font-medium">Pair</th>
              <th className="px-4 py-2.5 font-medium">Clip</th>
              <th className="px-4 py-2.5 text-right font-medium">Seconds</th>
              <th className="px-4 py-2.5 text-right font-medium">Rate</th>
              <th className="px-4 py-2.5 text-right font-medium">Size</th>
              <th className="px-4 py-2.5 font-medium">Stored as</th>
              <th className="px-4 py-2.5 font-medium">sha256</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-b border-line/50 last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/pairs/${row.pairSlug}`}
                    className="text-xs text-muted transition-colors hover:text-accent"
                  >
                    {row.pairName}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span className="font-medium text-ink">{row.label}</span>
                  <span className="ml-2 font-mono text-[10px] text-faint">{row.path}</span>
                </td>
                <td className="tnum px-4 py-2 text-right text-muted">
                  {row.durationSeconds.toFixed(2)}
                </td>
                <td className="tnum px-4 py-2 text-right text-muted">
                  {formatKhz(row.sampleRate)}
                </td>
                <td className="tnum px-4 py-2 text-right text-muted">{formatBytes(row.bytes)}</td>
                <td className="px-4 py-2 text-xs">
                  <span className={row.resampled ? "text-amber" : "text-faint"}>
                    {row.subtype ?? "—"}
                    {row.resampled ? " · resampled" : " · original"}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-[10px] text-faint" title={row.sha256}>
                  {row.sha256.slice(0, 16)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
