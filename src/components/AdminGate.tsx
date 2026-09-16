"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cx } from "@/lib/format";

/** Shown instead of the dashboard when ADMIN_PASSCODE is set. */
export function AdminGate() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (response.ok) {
        router.refresh();
        return;
      }
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "That passcode does not match.");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel mx-auto mt-16 max-w-sm rounded-2xl p-6">
      <h1 className="text-xl font-semibold text-ink">Everyone&rsquo;s ratings</h1>
      <p className="mt-1.5 text-sm text-muted">
        This page collects every participant&rsquo;s scores and feedback. Enter the passcode to
        open it.
      </p>
      <input
        type="password"
        value={passcode}
        autoFocus
        onChange={(event) => setPasscode(event.target.value)}
        placeholder="Passcode"
        aria-label="Admin passcode"
        className="mt-4 w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink placeholder:text-faint"
      />
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={pending || passcode.length === 0}
        className={cx(
          "mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity",
          pending || passcode.length === 0
            ? "cursor-not-allowed bg-sunken text-faint"
            : "bg-accent text-bg hover:opacity-90",
        )}
      >
        {pending ? "Checking…" : "Open"}
      </button>
      <p className="mt-3 text-xs text-faint">
        The passcode is the <code className="font-mono">ADMIN_PASSCODE</code> environment
        variable. Remove it to leave this page open.
      </p>
    </form>
  );
}
