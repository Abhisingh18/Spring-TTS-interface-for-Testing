import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AutoPrint } from "@/components/AutoPrint";
import { getBundle } from "@/lib/bundle";
import { summariseRecords } from "@/lib/results";
import { isAdmin } from "@/lib/session";
import { getStore, storeDescription } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Listening study report",
};

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  if (!(await isAdmin())) notFound();

  const [snapshot, bundle] = await Promise.all([getStore().snapshot(), getBundle()]);
  const modelLabel = new Map(bundle.models.map((model) => [model.key, model.label]));
  const pairName = new Map(bundle.pairs.map((pair) => [pair.slug, pair.name]));

  const scored = snapshot.ratings.filter(
    (rating) => rating.naturalness !== null || rating.similarity !== null,
  );
  const ranking = summariseRecords(scored, (key) => modelLabel.get(key) ?? key);
  const contributors = new Set(scored.map((rating) => rating.participantId));
  const generated = new Date();

  const perParticipant = snapshot.participants
    .map((participant) => {
      const own = scored.filter((rating) => rating.participantId === participant.id);
      return { participant, count: own.length };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-4xl space-y-7 py-4">
      <AutoPrint />

      <header className="border-b border-line pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
          Voice conversion listening study · 16 kHz
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
          Results report
        </h1>
        <p className="mt-1 text-sm text-muted">
          {generated.toLocaleString()} · {bundle.stats.pairs} pairs · {bundle.stats.models} models
          · submissions stored in {storeDescription()}
        </p>
      </header>

      <section className="grid grid-cols-4 gap-3">
        {[
          { label: "Participants", value: snapshot.participants.length },
          { label: "Contributors", value: contributors.size },
          { label: "Scores", value: scored.length },
          { label: "Feedback", value: snapshot.feedback.length },
        ].map((item) => (
          <div key={item.label} className="panel rounded-xl px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              {item.label}
            </div>
            <div className="tnum mt-0.5 text-xl font-semibold text-ink">{item.value}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Model ranking · mean of all participants
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-faint">
              <th className="py-1.5 pr-2 font-medium">#</th>
              <th className="py-1.5 pr-2 font-medium">Model</th>
              <th className="py-1.5 pr-2 text-right font-medium">Naturalness</th>
              <th className="py-1.5 pr-2 text-right font-medium">Speaker similarity</th>
              <th className="py-1.5 pr-2 text-right font-medium">Overall</th>
              <th className="py-1.5 text-right font-medium">n</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => (
              <tr key={row.modelKey} className="border-b border-line">
                <td className="tnum py-1.5 pr-2 text-faint">{index + 1}</td>
                <td className="py-1.5 pr-2 font-medium text-ink">{row.modelLabel}</td>
                <td className="tnum py-1.5 pr-2 text-right text-muted">
                  {format(row.naturalness)}
                </td>
                <td className="tnum py-1.5 pr-2 text-right text-muted">
                  {format(row.similarity)}
                </td>
                <td className="tnum py-1.5 pr-2 text-right font-semibold text-ink">
                  {format(row.overall)}
                </td>
                <td className="tnum py-1.5 text-right text-faint">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ranking.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No scores submitted yet.</p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Participants
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-faint">
              <th className="py-1.5 pr-2 font-medium">Name</th>
              <th className="py-1.5 pr-2 text-right font-medium">Scores</th>
              <th className="py-1.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {perParticipant.map((row) => (
              <tr key={row.participant.id} className="border-b border-line">
                <td className="py-1.5 pr-2 text-ink" dir="auto">
                  {row.participant.name}
                </td>
                <td className="tnum py-1.5 pr-2 text-right text-muted">{row.count}</td>
                <td className="py-1.5 text-xs text-faint">
                  {new Date(row.participant.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {snapshot.feedback.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
            Written feedback
          </h2>
          <ul className="space-y-2.5">
            {snapshot.feedback.map((entry) => (
              <li key={entry.participantId} className="panel rounded-xl p-3">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-ink" dir="auto">
                    {entry.participantName}
                  </span>
                  <span className="text-faint">
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p dir="auto" className="mt-1 whitespace-pre-wrap text-sm text-muted">
                  {entry.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          Every score
        </h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-line-strong text-left uppercase tracking-wider text-faint">
              <th className="py-1 pr-2 font-medium">Participant</th>
              <th className="py-1 pr-2 font-medium">Pair</th>
              <th className="py-1 pr-2 font-medium">Model</th>
              <th className="py-1 pr-2 text-right font-medium">Nat.</th>
              <th className="py-1 text-right font-medium">Spk.</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((rating) => (
              <tr
                key={`${rating.participantId}-${rating.pairSlug}-${rating.modelKey}`}
                className="border-b border-line"
              >
                <td className="py-1 pr-2 text-ink" dir="auto">
                  {rating.participantName}
                </td>
                <td className="py-1 pr-2 text-muted">
                  {pairName.get(rating.pairSlug) ?? rating.pairSlug}
                </td>
                <td className="py-1 pr-2 text-muted">
                  {modelLabel.get(rating.modelKey) ?? rating.modelKey}
                </td>
                <td className="tnum py-1 pr-2 text-right text-muted">
                  {rating.naturalness ?? "—"}
                </td>
                <td className="tnum py-1 text-right text-muted">{rating.similarity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="border-t border-line pt-3 text-[11px] text-faint">
        Scores are 1–5. Naturalness = how clean and human the clip sounds. Speaker similarity =
        how close the voice is to the target reference. Generated by Spring Lab Listening Studio.
      </footer>
    </div>
  );
}

function format(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}
