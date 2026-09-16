const QUESTIONS: Array<[string, string]> = [
  [
    "Where does the audio actually live?",
    "In object storage, never in Postgres. The database keeps the checksum, duration, sample rate, channels and the storage key; the browser only ever sees an asset id, which the server resolves. Audio is streamed with HTTP range requests so seeking does not download the whole file.",
  ],
  [
    "Can an evaluator work out which model they are hearing?",
    "No. Trial order and model order are randomised on the server from a seed stored on the session, and evaluators receive letters only. The mapping back to a model version stays server-side and is visible to researchers and admins.",
  ],
  [
    "What happens if someone loses connection mid-session?",
    "Scores are written locally first and mirrored to the server, so a dropped connection never costs an evaluator their work. The session records its own progress and can be resumed from any device.",
  ],
  [
    "Can a published experiment be edited?",
    "Not silently. Completed experiments are immutable — changing a dataset, rubric, model set or protocol forks a new experiment version, so a number in a paper still resolves to the run that produced it.",
  ],
  [
    "Which statistics does it compute?",
    "Means and medians always; distributions, bootstrap confidence intervals, paired comparisons and agreement coefficients where the design supports them. The analysis layer records which statistic it used and why, rather than applying every test it knows.",
  ],
  [
    "Can it be self-hosted?",
    "That is the intended deployment. Postgres, Redis and S3-compatible storage you control, with the web app and workers alongside. Nothing leaves your infrastructure.",
  ],
];

/** Details/summary accordion — keyboard accessible with no JavaScript. */
export function Faq() {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-3xl border border-line bg-panel backdrop-blur">
      {QUESTIONS.map(([question, answer]) => (
        <details key={question} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink marker:hidden">
            {question}
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform duration-300 group-open:rotate-45"
              aria-hidden="true"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 1.5v9M1.5 6h9" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted">{answer}</p>
        </details>
      ))}
    </div>
  );
}
