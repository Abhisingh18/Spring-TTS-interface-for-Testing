import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel mx-auto mt-16 max-w-md rounded-2xl p-6 text-center">
      <h1 className="text-2xl font-semibold text-ink">That pair is not in the bundle</h1>
      <p className="mt-2 text-sm text-muted">
        The bundle holds ten pairs. Pick one from the strip at the top, or start from the overview.
      </p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg"
      >
        Back to overview
      </Link>
    </div>
  );
}
