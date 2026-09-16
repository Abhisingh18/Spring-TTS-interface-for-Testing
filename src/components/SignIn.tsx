"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cx } from "@/lib/format";
import { useListenerStore } from "@/store/listener";
import { useRatingsStore, type ServerRating } from "@/store/ratings";

/**
 * Restores the session on every page and pulls back whatever this listener has
 * already scored, so moving to another browser or device picks up where they
 * left off.
 */
export function ListenerBoot() {
  const hydrate = useListenerStore((state) => state.hydrate);
  const listener = useListenerStore((state) => state.listener);
  const mergeFromServer = useRatingsStore((state) => state.mergeFromServer);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!listener) return;
    let cancelled = false;
    fetch("/api/ratings", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ ratings?: ServerRating[] }>)
      .then((body) => {
        if (!cancelled && body.ratings?.length) mergeFromServer(body.ratings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [listener, mergeFromServer]);

  return null;
}

/** Name-only sign-in. No password, no email — just who is listening. */
export function SignInForm({
  redirectTo,
  autoFocus = false,
  compact = false,
}: {
  redirectTo?: string;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const signIn = useListenerStore((state) => state.signIn);
  const pending = useListenerStore((state) => state.pending);
  const error = useListenerStore((state) => state.error);
  const [name, setName] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const ok = await signIn(name);
    if (ok && redirectTo) router.push(redirectTo);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className={cx("flex gap-2", compact ? "flex-row" : "flex-col sm:flex-row")}>
        <input
          type="text"
          value={name}
          autoFocus={autoFocus}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          maxLength={40}
          className="min-w-0 flex-1 rounded-xl border border-line bg-panel-solid px-4 py-3.5 text-[15px] text-ink placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={pending || name.trim().length < 2}
          className={cx(
            "shrink-0 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all",
            pending || name.trim().length < 2
              ? "cursor-not-allowed bg-sunken text-faint"
              : "bg-accent text-bg shadow-lg hover:opacity-90 active:scale-[0.98]",
          )}
        >
          {pending ? "Starting…" : "Start listening"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {!compact ? (
        <p className="mt-2.5 text-xs text-faint">
          No password, no email. The name is only used to label your scores in the results.
        </p>
      ) : null}
    </form>
  );
}

/** Header chip: who is listening, with a way out. */
export function ListenerBadge() {
  const listener = useListenerStore((state) => state.listener);
  const ready = useListenerStore((state) => state.ready);
  const signOut = useListenerStore((state) => state.signOut);
  const router = useRouter();

  if (!ready) return <span className="h-9 w-24" aria-hidden="true" />;

  if (!listener) {
    return (
      <Link
        href="/start"
        className="rounded-lg border border-accent/50 bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="hidden max-w-[12rem] truncate rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink sm:block"
        title={listener.name}
      >
        {listener.name}
      </span>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        className="rounded-lg px-2 py-1.5 text-xs text-faint transition-colors hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}

/**
 * Shown above the model grid when nobody is signed in — scores would otherwise
 * stay in this browser and never reach the shared results.
 */
export function SignInNotice() {
  const listener = useListenerStore((state) => state.listener);
  const ready = useListenerStore((state) => state.ready);

  if (!ready || listener) return null;

  return (
    <div className="panel flex flex-wrap items-center gap-3 rounded-2xl border-amber/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">You are listening as a guest</p>
        <p className="text-xs text-muted">
          Scores stay in this browser until you add your name — they will not appear in the shared
          results.
        </p>
      </div>
      <div className="w-full sm:w-auto sm:min-w-[20rem]">
        <SignInForm compact />
      </div>
    </div>
  );
}
