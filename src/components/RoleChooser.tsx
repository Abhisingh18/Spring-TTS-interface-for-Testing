"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cx } from "@/lib/format";
import { useListenerStore } from "@/store/listener";

/**
 * The studio entrance. Two ways in, chosen up front rather than discovered:
 * a member signs in with a name so their scores can be told apart, and an
 * administrator goes straight through to the management side.
 */
export function RoleChooser() {
  const router = useRouter();
  const listener = useListenerStore((state) => state.listener);
  const ready = useListenerStore((state) => state.ready);
  const signIn = useListenerStore((state) => state.signIn);
  const signOut = useListenerStore((state) => state.signOut);
  const pending = useListenerStore((state) => state.pending);
  const error = useListenerStore((state) => state.error);

  const [name, setName] = useState("");
  // Members choose a language benchmark first, then work through its pairs.
  const studioHref = "/collections";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await signIn(name)) router.push(studioHref);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ------------------------------------------------------- member -- */}
      <section className="panel-raised sweep flex flex-col rounded-3xl p-6 sm:p-7">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl text-white"
          style={{ background: "linear-gradient(140deg, var(--primary-from), var(--primary-to))" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.6" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
          </svg>
        </span>

        <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">Member</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Pick a language benchmark, listen to the clips and score them. Add your name so your
          ratings can be told apart from everyone else&rsquo;s — no password, no email.
        </p>

        <ul className="mt-4 space-y-1.5">
          {["Choose a language collection", "Listen and compare models", "Rate naturalness and speaker similarity"].map(
            (item) => (
              <li key={item} className="flex items-center gap-2 text-[13px] text-muted">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--primary-to)" strokeWidth="2" aria-hidden="true">
                  <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ),
          )}
        </ul>

        <div className="mt-auto pt-6">
          {!ready ? (
            <div className="skeleton h-[52px] w-full rounded-xl" aria-busy="true" />
          ) : listener ? (
            <div className="rounded-2xl border border-line bg-sunken/60 p-3.5 text-center">
              <p className="text-sm text-muted">
                Signed in as{" "}
                <span className="font-semibold text-ink" dir="auto">
                  {listener.name}
                </span>
              </p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                <Link
                  href={studioHref}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: "var(--primary-to)" }}
                >
                  Continue listening
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-full px-3 py-2.5 text-sm text-faint transition-colors hover:text-ink"
                >
                  Not you?
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label htmlFor="member-name" className="sr-only">
                Your name
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="member-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  maxLength={40}
                  autoComplete="name"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-panel-solid px-4 py-3 text-[15px] text-ink placeholder:text-faint"
                />
                <button
                  type="submit"
                  disabled={pending || name.trim().length < 2}
                  className={cx(
                    "shrink-0 rounded-xl px-5 py-3 text-sm font-semibold transition-all",
                    pending || name.trim().length < 2
                      ? "cursor-not-allowed bg-sunken text-faint"
                      : "text-white shadow-lg hover:opacity-90 active:scale-[0.98]",
                  )}
                  style={
                    pending || name.trim().length < 2
                      ? undefined
                      : { background: "var(--primary-to)" }
                  }
                >
                  {pending ? "Starting…" : "Start listening"}
                </button>
              </div>
              {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
            </form>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------- admin -- */}
      <section className="panel flex flex-col rounded-3xl p-6 sm:p-7">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-sunken text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M12 3.5 4.5 6.8v4.9c0 4.2 3 7.6 7.5 8.8 4.5-1.2 7.5-4.6 7.5-8.8V6.8L12 3.5Z" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">Admin</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Open the management side directly. No sign-in and no password — everything is available
          straight away.
        </p>

        <ul className="mt-4 space-y-1.5">
          {[
            "See every member's ratings",
            "Model ranking and pair-by-pair breakdown",
            "Read all written feedback",
            "Export JSON, CSV and a printable report",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[13px] text-muted">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--primary-to)" strokeWidth="2" aria-hidden="true">
                <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Link
            href="/admin"
            className="group inline-flex items-center gap-2 rounded-xl border border-line bg-panel-solid px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-line-strong"
          >
            Open admin
            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
              →
            </span>
          </Link>
          <Link
            href="/data"
            className="rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Bundle data
          </Link>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Unprotected by design. Anyone with this link reaches the dashboard, so keep it within the
          lab — or set an <code className="font-mono">ADMIN_PASSCODE</code> to require one.
        </p>
      </section>
    </div>
  );
}
