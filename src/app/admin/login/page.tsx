import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { branding, splitWordmark } from "@/config/branding";
import { adminEmail, isAdmin, usingDefaultPassword } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Administrator sign-in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const CAPABILITIES = [
  "Create collections and model columns",
  "Upload a clip into every cell",
  "Read every member's scores and feedback",
  "Export JSON, CSV and a printable report",
];

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in — no reason to show a form.
  if (await isAdmin()) redirect(safeNext(next));

  const [wordmarkHead, wordmarkTail] = splitWordmark(branding.name);

  return (
    <div className="ses-landing relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------- brand panel -- */}
      <aside className="ses-grid relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 70% at 25% 20%, color-mix(in oklab, var(--primary-from) 26%, transparent), transparent 70%)",
          }}
        />

        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold text-white"
            style={{ background: "linear-gradient(140deg, var(--primary-from), var(--primary-to))" }}
          >
            {branding.shortName.slice(0, 1)}
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            {wordmarkHead} <span className="font-normal text-muted">{wordmarkTail}</span>
          </span>
        </Link>

        <div className="max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Management
          </p>
          <h2 className="mt-3 text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
            Run the study,
            <br />
            <span className="ses-gradient-text">not just the playback.</span>
          </h2>
          <ul className="mt-7 space-y-2.5">
            {CAPABILITIES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] text-muted">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="var(--primary-to)"
                  strokeWidth="2"
                  className="mt-1 shrink-0"
                  aria-hidden="true"
                >
                  <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-faint">
          Members do not need this. They sign in with a name on{" "}
          <Link href="/start" className="text-accent hover:underline">
            the entry page
          </Link>
          .
        </p>
      </aside>

      {/* -------------------------------------------------------- form -- */}
      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold text-white"
              style={{ background: "linear-gradient(140deg, var(--primary-from), var(--primary-to))" }}
            >
              {branding.shortName.slice(0, 1)}
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-ink">
              {wordmarkHead} <span className="font-normal text-muted">{wordmarkTail}</span>
            </span>
          </Link>

          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Administrator access to the management side.
          </p>

          <AdminLoginForm
            next={safeNext(next)}
            placeholderEmail={adminEmail()}
            showDefaultHint={usingDefaultPassword()}
          />

          <p className="mt-8 border-t border-line pt-5 text-center text-[13px] text-muted">
            Not an administrator?{" "}
            <Link href="/start" className="font-medium text-accent hover:underline">
              Join as a member
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Only ever bounce back to a path inside this app's management side, so a
 * crafted `?next=` cannot turn the login into an open redirect.
 */
function safeNext(value: string | undefined): string {
  if (!value) return "/admin/workspace";
  if (!value.startsWith("/admin")) return "/admin/workspace";
  if (value.startsWith("//") || value.includes("..")) return "/admin/workspace";
  if (value.startsWith("/admin/login")) return "/admin/workspace";
  return value;
}
