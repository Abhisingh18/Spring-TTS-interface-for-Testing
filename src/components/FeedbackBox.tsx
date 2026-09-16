"use client";

import { useState } from "react";

import { cx } from "@/lib/format";
import { useListenerStore } from "@/store/listener";

/** Free-text impressions, one per participant, shown to whoever runs the study. */
export function FeedbackBox() {
  const listener = useListenerStore((state) => state.listener);
  const ready = useListenerStore((state) => state.ready);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  if (!ready) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setStatus(response.ok ? "saved" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <form onSubmit={submit} className="panel rounded-2xl p-5">
      <h2 className="text-base font-semibold text-ink">Anything else you noticed?</h2>
      <p className="mt-1 text-sm text-muted">
        Artefacts, accents that slipped, models that kept the words but lost the speaker — a
        sentence or two helps more than the numbers alone.
      </p>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setStatus("idle");
        }}
        rows={4}
        maxLength={4000}
        dir="auto"
        placeholder={
          listener
            ? "Your impressions…"
            : "Add your name above first — feedback is filed under it."
        }
        disabled={!listener}
        className="mt-3 w-full resize-y rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-sm text-ink placeholder:text-faint disabled:opacity-60"
      />
      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="submit"
          disabled={!listener || text.trim().length === 0 || status === "saving"}
          className={cx(
            "rounded-xl px-4 py-2 text-sm font-semibold transition-opacity",
            !listener || text.trim().length === 0 || status === "saving"
              ? "cursor-not-allowed bg-sunken text-faint"
              : "bg-accent text-bg hover:opacity-90",
          )}
        >
          {status === "saving" ? "Sending…" : "Send feedback"}
        </button>
        {status === "saved" ? (
          <span className="text-sm text-teal">Saved — thank you.</span>
        ) : null}
        {status === "failed" ? (
          <span className="text-sm text-danger">Could not save. Try again?</span>
        ) : null}
        <span className="tnum ml-auto text-xs text-faint">{text.length}/4000</span>
      </div>
    </form>
  );
}
