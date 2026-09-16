"use client";

import Link from "next/link";

import { SignInForm } from "@/components/SignIn";
import { useListenerStore } from "@/store/listener";

/** The landing hero's call to action: sign in, or carry on if already signed in. */
export function LandingStart({ firstPairSlug }: { firstPairSlug: string }) {
  const listener = useListenerStore((state) => state.listener);
  const ready = useListenerStore((state) => state.ready);
  const signOut = useListenerStore((state) => state.signOut);

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] opacity-70 blur-2xl"
        style={{ background: "radial-gradient(50% 120% at 50% 50%, var(--accent-glow), transparent 70%)" }}
      />

      {!ready ? (
        <div className="panel-raised h-[102px] rounded-2xl p-4" aria-busy="true">
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      ) : listener ? (
        <div className="panel-raised animate-[fade-in_0.3s_ease] rounded-2xl p-4 text-center">
          <p className="text-sm text-muted">
            Listening as{" "}
            <span className="font-semibold text-ink" dir="auto">
              {listener.name}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link
              href={`/pairs/${firstPairSlug}`}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg shadow-lg transition-opacity hover:opacity-90"
            >
              Continue listening
            </Link>
            <Link
              href="/results"
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong"
            >
              My scores
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-xl px-3 py-2.5 text-sm text-faint transition-colors hover:text-ink"
            >
              Not you?
            </button>
          </div>
        </div>
      ) : (
        <div className="panel-raised animate-[fade-in_0.3s_ease] rounded-2xl p-4">
          <SignInForm redirectTo={`/pairs/${firstPairSlug}`} autoFocus />
        </div>
      )}
    </div>
  );
}
