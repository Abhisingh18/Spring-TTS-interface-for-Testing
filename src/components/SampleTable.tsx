"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cx, formatBytes, formatKhz } from "@/lib/format";
import type { SampleRow } from "@/lib/models";

type RoleFilter = "all" | "model" | "reference" | "resampled";
type SortKey = "pair" | "duration" | "size" | "model";

const PAGE_SIZE = 25;

const ROLE_LABEL: Record<RoleFilter, string> = {
  all: "All",
  model: "Models",
  reference: "References",
  resampled: "Resampled",
};

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
      {/* ------------------------------------------------------- filters -- */}
      <div className="panel flex flex-wrap items-center gap-2 rounded-2xl p-2.5">
        <div className="relative min-w-[16rem] flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="m11 11 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => reset(setQuery)(event.target.value)}
            placeholder="Search model, pair, speaker, path or sha256…"
            aria-label="Search samples"
            className="w-full rounded-xl border border-line bg-panel-solid py-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>

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

        <div className="flex gap-1 rounded-xl border border-line bg-panel-solid p-1">
          {(["all", "model", "reference", "resampled"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => reset(setRole)(value)}
              aria-pressed={role === value}
              className={cx(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                role === value
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-sunken hover:text-ink",
              )}
            >
              {ROLE_LABEL[value]}
            </button>
          ))}
        </div>

        <span className="tnum ml-auto shrink-0 px-1 text-xs text-faint">
          {filtered.length} of {samples.length}
        </span>
      </div>

      {/* --------------------------------------------------------- table -- */}
      <div className="panel overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-sunken/40 text-left text-[11px] uppercase tracking-wider text-faint">
              <th className="w-11 px-3 py-2.5 font-medium">Play</th>
              <th className="px-3 py-2.5 font-medium">Clip</th>
              <th className="px-3 py-2.5 font-medium">Pair</th>
              <th className="px-3 py-2.5 font-medium">Speaker</th>
              <th className="px-3 py-2.5 text-right font-medium">Duration</th>
              <th className="px-3 py-2.5 text-right font-medium">Rate</th>
              <th className="px-3 py-2.5 text-right font-medium">Size</th>
              <th className="px-3 py-2.5 font-medium">Format</th>
              <th className="px-3 py-2.5 font-medium">Checksum</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((sample) => (
              <tr
                key={sample.id}
                className="group border-b border-line/50 transition-colors last:border-0 hover:bg-sunken/40"
              >
                <td className="px-3 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => setPlaying(playing === sample.id ? null : sample.id)}
                    aria-label={`${playing === sample.id ? "Stop" : "Play"} ${sample.modelLabel}`}
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors",
                      playing === sample.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line text-muted group-hover:border-line-strong group-hover:text-ink",
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

                <td className="max-w-[15rem] px-3 py-2 align-top">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-medium text-ink">
                      {sample.modelLabel}
                    </span>
                    <span
                      className="truncate font-mono text-[10px] text-faint"
                      title={sample.path}
                    >
                      {sample.path}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-2 align-top">
                  <Link
                    href={`/pairs/${sample.pairSlug}`}
                    className="text-xs font-medium text-muted transition-colors hover:text-accent"
                  >
                    {sample.pairName}
                  </Link>
                </td>

                <td className="max-w-[9rem] truncate px-3 py-2 align-top text-xs text-muted">
                  {sample.speaker}
                </td>

                <td className="tnum px-3 py-2 text-right align-top text-muted">
                  {sample.durationSeconds.toFixed(2)}s
                </td>

                <td className="tnum px-3 py-2 text-right align-top text-muted">
                  {formatKhz(sample.sampleRate)}
                </td>

                <td className="tnum px-3 py-2 text-right align-top text-muted">
                  {formatBytes(sample.bytes)}
                </td>

                <td className="px-3 py-2 align-top">
                  <span
                    className={cx(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      sample.resampled
                        ? "border-amber/40 bg-amber/10 text-amber"
                        : "border-line text-faint",
                    )}
                  >
                    {sample.subtype ?? "—"}
                    {sample.resampled ? " · resampled" : ""}
                  </span>
                </td>

                <td className="px-3 py-2 align-top">
                  <span
                    className="tnum cursor-help font-mono text-[10px] text-faint"
                    title={sample.sha256}
                  >
                    {sample.sha256.slice(0, 10)}…
                  </span>
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

      {/* ------------------------------------------------------- pager -- */}
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="tnum text-xs text-faint">
            Page {current + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(current - 1, 0))}
              disabled={current === 0}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(current + 1, pageCount - 1))}
              disabled={current >= pageCount - 1}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
