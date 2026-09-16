"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Waveform } from "@/components/Waveform";
import { cx, formatClock, formatDelta, formatKhz, formatBytes, shortHash } from "@/lib/format";
import type { Clip } from "@/lib/types";
import {
  getSharedPosition,
  registerPlayer,
  setSharedPosition,
  usePlayerStore,
} from "@/store/player";

interface ClipPlayerProps {
  clip: Clip;
  accent: string;
  /** Keyboard hint shown in the corner, e.g. `1` or `S`. */
  hotkey?: string;
  /** Overrides the clip label — used to anonymise clips in the blind test. */
  displayLabel?: string;
  displaySubtitle?: string;
  /** Duration of the source clip for this pair, for the length-drift badge. */
  referenceDuration?: number;
  eager?: boolean;
  compact?: boolean;
  footer?: ReactNode;
}

export function ClipPlayer({
  clip,
  accent,
  hotkey,
  displayLabel,
  displaySubtitle,
  referenceDuration,
  eager = false,
  compact = false,
  footer,
}: ClipPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(false);

  const activeId = usePlayerStore((state) => state.activeId);
  const rate = usePlayerStore((state) => state.rate);
  const volume = usePlayerStore((state) => state.volume);
  const loop = usePlayerStore((state) => state.loop);
  const solo = usePlayerStore((state) => state.solo);
  const keepPosition = usePlayerStore((state) => state.keepPosition);
  const setActive = usePlayerStore((state) => state.setActive);
  const clearActive = usePlayerStore((state) => state.clearActive);

  const label = displayLabel ?? clip.label;

  const play = useCallback(() => {
    const element = audioRef.current;
    if (!element) return;
    if (keepPosition) {
      const position = getSharedPosition();
      if (position > 0 && position < clip.durationSeconds) element.currentTime = position;
    }
    void element.play().catch(() => setError(true));
  }, [clip.durationSeconds, keepPosition]);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const toggle = useCallback(() => {
    const element = audioRef.current;
    if (!element) return;
    if (element.paused) play();
    else element.pause();
  }, [play]);

  const seekTo = useCallback(
    (seconds: number) => {
      const element = audioRef.current;
      if (!element) return;
      element.currentTime = Math.min(Math.max(seconds, 0), clip.durationSeconds);
      setElapsed(element.currentTime);
      setSharedPosition(element.currentTime);
    },
    [clip.durationSeconds],
  );

  const seekBy = useCallback(
    (delta: number) => seekTo((audioRef.current?.currentTime ?? 0) + delta),
    [seekTo],
  );

  const restart = useCallback(() => {
    seekTo(0);
    play();
  }, [play, seekTo]);

  // Stable identity: an inline ref callback would detach and re-attach on every
  // render, and the null it writes in between would loop the state update.
  const attachAudio = useCallback((element: HTMLAudioElement | null) => {
    audioRef.current = element;
    setAudio(element);
  }, []);

  useEffect(
    () => registerPlayer(clip.id, { play, pause, toggle, seekBy, seekTo, restart }),
    [clip.id, play, pause, toggle, seekBy, seekTo, restart],
  );

  // Solo listening: starting one clip pauses whatever else was running.
  useEffect(() => {
    if (solo && playing && activeId && activeId !== clip.id) pause();
  }, [activeId, clip.id, pause, playing, solo]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    element.playbackRate = rate;
    element.volume = volume;
    element.loop = loop;
  }, [rate, volume, loop]);

  const drift =
    referenceDuration !== undefined ? clip.durationSeconds - referenceDuration : undefined;
  const progress = clip.durationSeconds > 0 ? elapsed / clip.durationSeconds : 0;

  return (
    <article
      className={cx(
        "panel lift group relative flex flex-col overflow-hidden rounded-2xl",
        playing && "border-transparent",
      )}
      style={
        playing
          ? ({
              boxShadow: `0 0 0 1px ${accent}, 0 0 28px -6px ${accent}, var(--shadow-lg)`,
            } as React.CSSProperties)
          : undefined
      }
      data-playing={playing || undefined}
    >
      {/* Accent rail: fills left-to-right with playback. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 85%)` }}
      />
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-[3px] transition-[width] duration-150 ease-linear"
        style={{ width: `${progress * 100}%`, background: accent }}
      />

      <div className={cx("flex items-start gap-3", compact ? "px-3.5 pt-3.5" : "px-4 pt-4")}>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
          className="relative mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            borderColor: playing ? accent : "transparent",
            color: accent,
            background: `color-mix(in oklab, ${accent} ${playing ? 22 : 13}%, transparent)`,
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-full opacity-25"
              style={{ background: accent, animationDuration: "2.4s" }}
            />
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">{label}</h3>
            {playing ? <EqualiserIcon accent={accent} /> : null}
            {hotkey ? (
              <kbd className="ml-auto shrink-0 rounded-md border border-line-strong bg-sunken px-1.5 py-px font-mono text-[10px] text-faint transition-colors group-hover:text-muted">
                {hotkey}
              </kbd>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted">{displaySubtitle ?? clip.subtitle}</p>
        </div>
      </div>

      <div className={cx(compact ? "px-3.5 pb-1 pt-2.5" : "px-4 pb-1 pt-3")}>
        <Waveform
          src={clip.src}
          audio={audio}
          accent={accent}
          duration={clip.durationSeconds}
          height={compact ? 46 : 60}
          eager={eager}
          onSeek={seekTo}
        />
      </div>

      <div
        className={cx(
          "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-faint",
          compact ? "px-3.5 pb-3" : "px-4 pb-4",
        )}
      >
        <span className="tnum font-mono text-muted">
          {formatClock(elapsed)}
          <span className="text-faint"> / {formatClock(clip.durationSeconds)}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span className="tnum">{formatKhz(clip.sampleRate)}</span>
        {drift !== undefined && Math.abs(drift) >= 0.005 ? (
          <>
            <span aria-hidden="true">·</span>
            <span
              className="tnum"
              title="Length difference against the source clip"
              style={{ color: Math.abs(drift) > 0.5 ? "var(--amber)" : undefined }}
            >
              {formatDelta(drift)}
            </span>
          </>
        ) : null}
        {clip.resampled ? (
          <span
            className="rounded-full border border-line px-1.5 py-px"
            title="Resampled to 16 kHz by the bundle (float32 WAV)"
          >
            resampled
          </span>
        ) : null}
        {error ? <span className="text-danger">playback failed</span> : null}

        <div className="ml-auto flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
          <IconButton label="Restart" onClick={restart}>
            <RestartIcon />
          </IconButton>
          <a
            href={clip.src}
            download={`${clip.id.replace("/", "__")}.wav`}
            className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
            aria-label={`Download ${label}`}
            title={`${formatBytes(clip.bytes)} · sha256 ${shortHash(clip.sha256)}`}
          >
            <DownloadIcon />
          </a>
        </div>
      </div>

      {footer ? (
        <div className="border-t border-line/70 bg-sunken/50 px-3.5 py-3">{footer}</div>
      ) : null}

      <audio
        ref={attachAudio}
        src={clip.src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          setActive(clip.id, label);
        }}
        onPause={() => {
          setPlaying(false);
          clearActive(clip.id);
        }}
        onEnded={() => {
          setPlaying(false);
          clearActive(clip.id);
          setSharedPosition(0);
        }}
        onTimeUpdate={(event) => {
          const element = event.currentTarget;
          setElapsed(element.currentTime);
          if (!element.paused) setSharedPosition(element.currentTime);
        }}
        onError={() => setError(true)}
      />
    </article>
  );
}

function EqualiserIcon({ accent }: { accent: string }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="w-[2px] origin-bottom rounded-full"
          style={{
            height: "100%",
            background: accent,
            animation: `bars 1.1s ease-in-out ${bar * 0.18}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 3.2v9.6c0 .5.56.8.98.53l7.1-4.8a.64.64 0 0 0 0-1.06l-7.1-4.8A.64.64 0 0 0 5 3.2Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="4" y="3" width="3" height="10" rx="1.2" />
      <rect x="9" y="3" width="3" height="10" rx="1.2" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M13 8a5 5 0 1 1-1.6-3.66" strokeLinecap="round" />
      <path d="M13.2 2.4v2.9h-2.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M8 2.5v7.5M5 7.2 8 10.2l3-3M3 12.5h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
