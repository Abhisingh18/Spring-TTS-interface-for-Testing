import type { Metadata } from "next";

import { MemberDashboard } from "@/components/MemberDashboard";
import { getBundle } from "@/lib/bundle";
import { listCollections } from "@/lib/collections";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your listening progress and your own scores.",
};

export default async function DashboardPage() {
  const [collections, { models }] = await Promise.all([listCollections(), getBundle()]);

  return (
    <MemberDashboard
      collections={collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        languageNative: collection.languageNative ?? null,
        pairs: collection.pairs.map((pair) => ({
          slug: pair.slug,
          name: pair.name,
          index: pair.index,
          models: pair.models.length,
        })),
      }))}
      models={models.map(({ key, label }) => ({ key, label }))}
    />
  );
}
