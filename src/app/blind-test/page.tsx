import type { Metadata } from "next";

import { requireResearcher } from "@/lib/guard";

import { BlindTest } from "@/components/BlindTest";
import { getBundle } from "@/lib/bundle";

export const metadata: Metadata = {
  title: "Blind test",
  description: "Score unlabelled conversions drawn at random from every pair and model.",
};

// Reads the session to keep members out, so it cannot be prerendered.
export const dynamic = "force-dynamic";

export default async function BlindTestPage() {
  await requireResearcher();
  const { pairs, models } = await getBundle();
  return <BlindTest pairs={pairs} models={models} />;
}
