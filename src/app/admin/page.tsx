import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/AdminDashboard";
import { getBundle } from "@/lib/bundle";
import { isAdmin } from "@/lib/admin-auth";
import { getStore, storeDescription } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Everyone's ratings",
  description: "Every participant's scores, ranked, with JSON and PDF export.",
};

// Reads the submission store, so it can never be prerendered.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin");

  const [snapshot, bundle] = await Promise.all([getStore().snapshot(), getBundle()]);

  return (
    <AdminDashboard
      snapshot={snapshot}
      pairs={bundle.pairs.map(({ slug, name }) => ({ slug, name }))}
      models={bundle.models}
      storage={storeDescription()}
    />
  );
}
