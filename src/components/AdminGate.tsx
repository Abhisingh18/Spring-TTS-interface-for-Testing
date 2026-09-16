"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cx } from "@/lib/format";

/** Administrator sign-in. Shown in place of any management page when signed out. */
export function AdminGate({ hint }: { hint?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        router.refresh();
        return;
      }
      const payload = (await response.json()) as { error?: { message?: string } };
      setError(payload.error?.message ?? "That email and password do not match.");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  const ready = email.trim().length > 3 && password.length > 0;

  return (
    <form onSubmit={submit} className="panel mx-auto mt-12 w-full max-w-sm rounded-2xl p-6">
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-sunken text-ink">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <rect x="4" y="10.5" width="16" height="10" rx="2.4" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
      </span>

      <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Administrator sign-in</h1>
      <p className="mt-1.5 text-sm text-muted">
        {hint ?? "The management side needs a credential. Members do not — they sign in with a name."}
      </p>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            Email
          </span>
          <input
            type="email"
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@spring.com"
            className="w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink placeholder:text-faint"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || !ready}
        className={cx(
          "mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity",
          pending || !ready ? "cursor-not-allowed bg-sunken text-faint" : "bg-accent text-bg hover:opacity-90",
        )}
      >
        {pending ? "Checking…" : "Sign in"}
      </button>

      <p className="mt-3 text-xs text-faint">
        Set <code className="font-mono">ADMIN_EMAIL</code> and{" "}
        <code className="font-mono">ADMIN_PASSWORD</code> to change the credential.
      </p>
    </form>
  );
}
