import type { Metadata } from "next";
import Link from "next/link";

import { RoleChooser } from "@/components/RoleChooser";
import { branding } from "@/config/branding";
import { getBundle } from "@/lib/bundle";

export const metadata: Metadata = {
  title: "Enter the studio",
  description: "Sign in as a member to rate clips, or open the admin side directly.",
};

export default async function StartPage() {
  const { pairs, stats } = await getBundle();

  return (
    <div className="mx-auto max-w-4xl py-10 sm:py-16">
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span>
          {branding.name}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-[2.6rem] sm:leading-[1.1]">
          How are you joining?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          {stats.pairs} dialect pairs, {stats.models} models and {stats.clips} clips are ready.
          Pick the side you need.
        </p>
      </div>

      <div className="mt-9">
        <RoleChooser firstPairSlug={pairs[0]?.slug ?? ""} />
      </div>
    </div>
  );
}
