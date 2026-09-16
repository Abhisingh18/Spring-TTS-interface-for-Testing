import type { Metadata } from "next";

import { ResultsView } from "@/components/ResultsView";
import { getBundle } from "@/lib/bundle";

export const metadata: Metadata = {
  title: "Results",
  description: "Aggregated listening scores from this browser, with CSV and JSON export.",
};

export default async function ResultsPage() {
  const { pairs, models } = await getBundle();
  return <ResultsView pairs={pairs} models={models} />;
}
