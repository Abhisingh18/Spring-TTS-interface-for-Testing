"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cx } from "@/lib/format";

const TASKS = ["TTS", "Voice conversion", "ASR", "S2ST", "Speech enhancement", "Other"];

/** Creates a benchmark. It starts as a draft, so members see nothing until it is ready. */
export function NewCollectionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("");
  const [languageNative, setLanguageNative] = useState("");
  const [task, setTask] = useState(TASKS[0]);
  const [description, setDescription] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, language, languageNative, task, description }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        setError(payload.error?.message ?? "Could not create the collection.");
        return;
      }
      const { collection } = (await response.json()) as { collection: { id: string } };
      router.push(`/admin/workspace/${collection.id}`);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
      >
        + New collection
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="panel rounded-2xl p-5">
      <h2 className="text-base font-semibold tracking-tight text-ink">New collection</h2>
      <p className="mt-1 text-sm text-muted">
        A language and a task. You add the model columns and utterance rows next.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Name" hint="Shown to members">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Kannada TTS benchmark"
            className="w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink"
          />
        </Field>

        <Field label="Task">
          <select
            value={task}
            onChange={(event) => setTask(event.target.value)}
            className="w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink"
          >
            {TASKS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Language">
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="Kannada"
            className="w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink"
          />
        </Field>

        <Field label="Native name" hint="Optional, in its own script">
          <input
            value={languageNative}
            onChange={(event) => setLanguageNative(event.target.value)}
            placeholder="ಕನ್ನಡ"
            dir="auto"
            className="w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Description" hint="Optional">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="What is being compared, and against what references."
              className="w-full resize-y rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink"
            />
          </Field>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || name.trim().length === 0}
          className={cx(
            "rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity",
            busy || name.trim().length === 0
              ? "cursor-not-allowed bg-sunken text-faint"
              : "bg-accent text-bg hover:opacity-90",
          )}
        >
          {busy ? "Creating…" : "Create collection"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          {label}
        </span>
        {hint ? <span className="text-[11px] text-faint/70">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
