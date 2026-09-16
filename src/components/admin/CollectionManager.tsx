"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cx } from "@/lib/format";
import type {
  WorkspaceCollection,
  WorkspaceItem,
  WorkspaceModel,
  WorkspaceSample,
} from "@/lib/workspace/types";

interface Props {
  collection: WorkspaceCollection;
  models: WorkspaceModel[];
  items: WorkspaceItem[];
  samples: WorkspaceSample[];
}

/**
 * The management matrix: rows are utterances, columns are models, and each cell
 * holds one clip. Adding a column adds a model to the whole collection; adding
 * a row adds an utterance every model is then asked for.
 */
export function CollectionManager({ collection, models, items, samples }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cell = (itemId: string, modelId: string | null, role: WorkspaceSample["role"]) =>
    samples.find(
      (sample) =>
        sample.itemId === itemId && sample.modelId === modelId && sample.role === role,
    );

  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    try {
      const response = await fetch(`/api/v1/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        setError(payload.error?.message ?? "That did not work.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function upload(
    file: File,
    itemId: string,
    modelId: string | null,
    role: WorkspaceSample["role"],
  ) {
    const key = `${itemId}:${modelId ?? role}`;
    setBusy(key);
    setError(null);

    const form = new FormData();
    form.set("file", file);
    form.set("collectionId", collection.id);
    form.set("itemId", itemId);
    form.set("role", role);
    if (modelId) form.set("modelId", modelId);

    try {
      const response = await fetch("/api/v1/samples", { method: "POST", body: form });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        setError(payload.error?.message ?? "Upload failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Upload failed — network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="panel rounded-xl border-danger/40 px-4 py-2.5 text-sm text-danger">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <AddModel onAdd={(name, version, notes) => patch({ action: "add-model", name, version, notes }, "model")} busy={busy === "model"} />
        <AddItem onAdd={(label, transcript) => patch({ action: "add-item", label, transcript }, "item")} busy={busy === "item"} />

        <button
          type="button"
          onClick={() =>
            patch(
              { action: "update", status: collection.status === "published" ? "draft" : "published" },
              "status",
            )
          }
          className={cx(
            "ml-auto rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
            collection.status === "published"
              ? "border border-line text-muted hover:text-ink"
              : "bg-accent text-bg hover:opacity-90",
          )}
        >
          {collection.status === "published" ? "Unpublish" : "Publish to members"}
        </button>
      </div>

      {models.length === 0 || items.length === 0 ? (
        <div className="panel rounded-2xl px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">
            {models.length === 0 ? "Add a model column to begin" : "Add a row to begin"}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
            A collection is a grid: each <strong className="text-ink">model</strong> is a column,
            each <strong className="text-ink">row</strong> is one utterance, and every cell holds
            that model&rsquo;s clip for that utterance.
          </p>
        </div>
      ) : (
        <div className="panel overflow-x-auto rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="sticky left-0 z-10 min-w-[13rem] bg-panel-solid px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-faint">
                  Utterance
                </th>
                <th className="min-w-[9rem] px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-faint">
                  Source
                </th>
                <th className="min-w-[9rem] px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-faint">
                  Target
                </th>
                {models.map((model) => (
                  <th key={model.id} className="min-w-[10rem] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-ink">
                          {model.name}
                        </span>
                        <span className="block font-mono text-[10px] text-faint">
                          {model.version}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => patch({ action: "delete-model", modelId: model.id }, "model")}
                        aria-label={`Remove ${model.name}`}
                        title={`Remove ${model.name} and its clips`}
                        className="shrink-0 rounded px-1 text-faint transition-colors hover:text-danger"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-line/60 last:border-0">
                  <td className="sticky left-0 z-10 bg-panel-solid px-3 py-2 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {item.label}
                        </span>
                        {item.transcript ? (
                          <span
                            dir="auto"
                            className="mt-0.5 block max-w-[16rem] truncate text-[11px] text-muted"
                          >
                            {item.transcript}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => patch({ action: "delete-item", itemId: item.id }, "item")}
                        aria-label={`Remove row ${item.label}`}
                        className="shrink-0 rounded px-1 text-faint transition-colors hover:text-danger"
                      >
                        ×
                      </button>
                    </div>
                  </td>

                  <Cell
                    sample={cell(item.id, null, "source")}
                    busy={busy === `${item.id}:source`}
                    onPick={(file) => upload(file, item.id, null, "source")}
                  />
                  <Cell
                    sample={cell(item.id, null, "target")}
                    busy={busy === `${item.id}:target`}
                    onPick={(file) => upload(file, item.id, null, "target")}
                  />

                  {models.map((model) => (
                    <Cell
                      key={model.id}
                      sample={cell(item.id, model.id, "generated")}
                      busy={busy === `${item.id}:${model.id}`}
                      onPick={(file) => upload(file, item.id, model.id, "generated")}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-faint">
        {items.length} row{items.length === 1 ? "" : "s"} × {models.length} model
        {models.length === 1 ? "" : "s"} · {samples.length} clip
        {samples.length === 1 ? "" : "s"} uploaded ·{" "}
        {items.length * models.length - samples.filter((s) => s.role === "generated").length} cell
        {items.length * models.length - samples.filter((s) => s.role === "generated").length === 1
          ? ""
          : "s"}{" "}
        still empty
      </p>
    </div>
  );
}

function Cell({
  sample,
  busy,
  onPick,
}: {
  sample: WorkspaceSample | undefined;
  busy: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <td className="px-3 py-2 align-top">
      {sample ? (
        <div className="space-y-1.5">
          <audio
            src={`/api/v1/samples/${sample.id}/audio`}
            controls
            preload="none"
            className="h-8 w-full"
          />
          <p className="tnum truncate font-mono text-[10px] text-faint" title={sample.filename}>
            {sample.sampleRate ? `${Math.round(sample.sampleRate / 100) / 10} kHz` : "—"}
            {sample.durationSec ? ` · ${sample.durationSec.toFixed(2)}s` : ""}
          </p>
          <FilePicker label="Replace" busy={busy} onPick={onPick} subtle />
        </div>
      ) : (
        <FilePicker label={busy ? "Uploading…" : "Upload"} busy={busy} onPick={onPick} />
      )}
    </td>
  );
}

function FilePicker({
  label,
  busy,
  onPick,
  subtle = false,
}: {
  label: string;
  busy: boolean;
  onPick: (file: File) => void;
  subtle?: boolean;
}) {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors",
        busy
          ? "cursor-wait border-line text-faint"
          : subtle
            ? "border-transparent text-faint hover:text-ink"
            : "border-dashed border-line-strong text-muted hover:border-accent hover:text-accent",
      )}
    >
      {label}
      <input
        type="file"
        accept="audio/wav,audio/flac,audio/mpeg,audio/ogg,.wav,.flac,.mp3,.ogg"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function AddModel({
  onAdd,
  busy,
}: {
  onAdd: (name: string, version: string, notes: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("v1");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        + Model column
      </button>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onAdd(name, version, "")) {
          setName("");
          setVersion("v1");
          setOpen(false);
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Model name"
        aria-label="Model name"
        className="w-40 rounded-xl border border-line bg-panel-solid px-3 py-2 text-sm text-ink"
      />
      <input
        value={version}
        onChange={(event) => setVersion(event.target.value)}
        placeholder="Version"
        aria-label="Model version"
        className="w-24 rounded-xl border border-line bg-panel-solid px-3 py-2 text-sm text-ink"
      />
      <button
        type="submit"
        disabled={busy || name.trim().length === 0}
        className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-xl px-2 py-2 text-sm text-faint hover:text-ink"
      >
        Cancel
      </button>
    </form>
  );
}

function AddItem({
  onAdd,
  busy,
}: {
  onAdd: (label: string, transcript: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [transcript, setTranscript] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        + Row
      </button>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onAdd(label, transcript)) {
          setLabel("");
          setTranscript("");
          setOpen(false);
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        autoFocus
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Utterance id"
        aria-label="Utterance id"
        className="w-40 rounded-xl border border-line bg-panel-solid px-3 py-2 text-sm text-ink"
      />
      <input
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
        placeholder="Transcript (optional)"
        aria-label="Transcript"
        dir="auto"
        className="w-56 rounded-xl border border-line bg-panel-solid px-3 py-2 text-sm text-ink"
      />
      <button
        type="submit"
        disabled={busy || label.trim().length === 0}
        className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-xl px-2 py-2 text-sm text-faint hover:text-ink"
      >
        Cancel
      </button>
    </form>
  );
}
