import type { Metadata } from "next";

import { BlindTest } from "@/components/BlindTest";
import { getBundle } from "@/lib/bundle";

export const metadata: Metadata = {
  title: "Blind test",
  description: "Score unlabelled conversions drawn at random from every pair and model.",
};

export default async function BlindTestPage() {
  const { pairs, models } = await getBundle();
  return <BlindTest pairs={pairs} models={models} />;
}
