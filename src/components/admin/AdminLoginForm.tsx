"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cx } from "@/lib/format";
import { useAdminStore } from "@/store/admin";

/** The credential form itself. The surrounding page owns the layout. */
export function AdminLoginForm({
  next,
  placeholderEmail,
  showDefaultHint,
}: {
  next: string;
  placeholderEmail: string;
  showDefaultHint: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ready = email.trim().length > 3 && password.length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // The layout's admin store fetched its answer once, at first mount —
        // without this it keeps showing the signed-out sidebar forever, no
        // matter what router.refresh() re-renders on the server.
        await useAdminStore.getState().refresh();
        // The gate is server-rendered too, so the new cookie needs a fresh render.
        router.replace(next);
        router.refresh();
        return;
      }

      const payload = (await response.json()) as { error?: { message?: string } };
      setError(payload.error?.message ?? "That email and password do not match.");
      setPassword("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Email</span>
        <input
          type="email"
          name="email"
          autoFocus
          autoComplete="username"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          placeholder={placeholderEmail}
          aria-invalid={error ? true : undefined}
          className="w-full rounded-xl border border-line bg-panel-solid px-4 py-3 text-[15px] text-ink placeholder:text-faint"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Password</span>
        <span className="relative block">
          <input
            type={reveal ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            className="w-full rounded-xl border border-line bg-panel-solid px-4 py-3 pr-12 text-[15px] text-ink"
          />
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-faint transition-colors hover:text-ink"
          >
            {reveal ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <path d="m4 20 16-16" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.6" />
              </svg>
            )}
          </button>
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 shrink-0" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v3.5M8 11h.01" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!ready || pending}
        className={cx(
          "w-full rounded-xl px-4 py-3 text-[15px] font-semibold transition-opacity",
          !ready || pending
            ? "cursor-not-allowed bg-sunken text-faint"
            : "text-white shadow-lg hover:opacity-90 active:scale-[0.99]",
        )}
        style={!ready || pending ? undefined : { background: "var(--primary-to)" }}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {showDefaultHint ? (
        <p className="rounded-xl border border-line bg-sunken/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted">
          <span className="font-medium text-ink">Default credential in use.</span> Sign in with{" "}
          <code className="font-mono text-ink">{placeholderEmail}</code> and the shipped password,
          then set <code className="font-mono">ADMIN_PASSWORD</code> before sharing the link.
        </p>
      ) : null}
    </form>
  );
}
