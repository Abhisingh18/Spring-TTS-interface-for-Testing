"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cx, formatBytes, formatKhz } from "@/lib/format";
import type { SampleRow } from "@/lib/models";

type RoleFilter = "all" | "model" | "reference" | "resampled";
type SortKey = "pair" | "duration" | "size" | "model";

const PAGE_SIZE = 25;

/**
 * The full clip table. Everything — filtering, sorting, paging — happens on the
 * already-loaded 120 rows; when this reads from the database instead it moves
 * behind the query, which is why the controls are shaped like query parameters.
 */
export function SampleTable({ samples }: { samples: SampleRow[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [pair, setPair] = useState("all");
  const [sort, setSort] = useState<SortKey>("pair");
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);

  const pairs = useMemo(
    () => [...new Set(samples.map((sample) => sample.pairName))],
    [samples],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const rows = samples.filter((sample) => {
      if (role === "model" && sample.role !== "model") return false;
      if (role === "reference" && sample.role === "model") return false;
      if (role === "resampled" && !sample.resampled) return false;
      if (pair !== "all" && sample.pairName !== pair) return false;
      if (!needle) return true;
      return (
        sample.modelLabel.toLowerCase().includes(needle) ||
        sample.pairName.toLowerCase().includes(needle) ||
        sample.path.toLowerCase().includes(needle) ||
        sample.speaker.toLowerCase().includes(needle) ||
        sample.sha256.startsWith(needle)
      );
    });

    return rows.sort((a, b) => {
      if (sort === "duration") return b.durationSeconds - a.durationSeconds;
      if (sort === "size") return b.bytes - a.bytes;
      if (sort === "model") return a.modelLabel.localeCompare(b.modelLabel);
      return a.pairName.localeCompare(b.pairName) || a.modelLabel.localeCompare(b.modelLabel);
    });
  }, [pair, query, role, samples, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => reset(setQuery)(event.target.value)}
          placeholder="Search model, pair, speaker, path or sha256…"
          aria-label="Search samples"
          className="min-w-[16rem] flex-1 rounded-xl border border-line bg-panel-solid px-3.5 py-2 text-sm text-ink placeholder:text-faint"
        />

        <select
          value={pair}
          onChange={(event) => reset(setPair)(event.target.value)}
          aria-label="Filter by pair"
          className="rounded-xl border border-line bg-panel-solid px-2.5 py-2 text-xs text-ink"
        >
          <option value="all">All pairs</option>
          {pairs.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          aria-label="Sort samples"
          className="rounded-xl border border-line bg-panel-solid px-2.5 py-2 text-xs text-ink"
        >
          <option value="pair">Pair order</option>
          <option value="model">Model name</option>
          <option value="duration">Longest first</option>
          <option value="size">Largest first</option>
        </select>

        {(["all", "model", "reference", "resampled"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => reset(setRole)(value)}
            aria-pressed={role === value}
            className={cx(
              "rounded-lg border px-2.5 py-2 text-xs capitalize transition-colors",
              role === value
                ? "border-accent/50 bg-accent-soft text-accent"
                : "border-line text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {value}
          </button>
        ))}

        <span className="tnum text-xs text-faint">
          {filtered.length} / {samples.length}
        </span>
      </div>

      <div className="panel overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
              <th className="px-3 py-2.5 font-medium">Play</th>
              <th className="px-3 py-2.5 font-medium">Clip</th>
              <th className="px-3 py-2.5 font-medium">Pair</th>
              <th className="px-3 py-2.5 font-medium">Speaker</th>
              <th className="px-3 py-2.5 text-right font-medium">Seconds</th>
              <th className="px-3 py-2.5 text-right font-medium">Rate</th>
              <th className="px-3 py-2.5 text-right font-medium">Size</th>
              <th className="px-3 py-2.5 font-medium">Stored as</th>
              <th className="px-3 py-2.5 font-medium">sha256</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((sample) => (
              <tr key={sample.id} className="border-b border-line/50 last:border-0">
                <td className="px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => setPlaying(playing === sample.id ? null : sample.id)}
                    aria-label={`${playing === sample.id ? "Stop" : "Play"} ${sample.modelLabel}`}
                    className={cx(
                      "grid h-7 w-7 place-items-center rounded-full border transition-colors",
                      playing === sample.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line text-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {playing === sample.id ? "■" : "▶"}
                  </button>
                  {playing === sample.id ? (
                    <audio
                      src={sample.src}
                      autoPlay
                      controls={false}
                      onEnded={() => setPlaying(null)}
                    />
                  ) : null}
                </td>
                <td className="px-3 py-1.5">
                  <span className="font-medium text-ink">{sample.modelLabel}</span>
                  <span className="ml-2 font-mono text-[10px] text-faint">{sample.path}</span>
                </td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/pairs/${sample.pairSlug}`}
                    className="text-xs text-muted transition-colors hover:text-accent"
                  >
                    {sample.pairName}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-xs text-muted">{sample.speaker}</td>
                <td className="tnum px-3 py-1.5 text-right text-muted">
                  {sample.durationSeconds.toFixed(2)}
                </td>
                <td className="tnum px-3 py-1.5 text-right text-muted">
                  {formatKhz(sample.sampleRate)}
                </td>
                <td className="tnum px-3 py-1.5 text-right text-muted">
                  {formatBytes(sample.bytes)}
                </td>
                <td className="px-3 py-1.5 text-xs">
                  <span className={sample.resampled ? "text-amber" : "text-faint"}>
                    {sample.subtype ?? "—"}
                    {sample.resampled ? " · resampled" : " · original"}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-faint" title={sample.sha256}>
                  {sample.sha256.slice(0, 12)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Nothing matches those filters.
          </p>
        ) : null}
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="tnum text-xs text-faint">
            Page {current + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(current - 1, 0))}
              disabled={current === 0}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:text-ink disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(current + 1, pageCount - 1))}
              disabled={current >= pageCount - 1}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:text-ink disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
