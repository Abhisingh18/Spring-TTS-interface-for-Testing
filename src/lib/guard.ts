import "server-only";

import { redirect } from "next/navigation";

import { isAdmin } from "./admin-auth";

/**
 * Management and analysis pages are for whoever runs the study. A member who
 * reaches one — by typing the path, or from an old link — goes to their own
 * dashboard rather than being shown an error.
 *
 * This is the server-side half of the rule. The sidebar only decides what to
 * offer; this decides what is allowed.
 */
export async function requireResearcher(): Promise<void> {
  if (!(await isAdmin())) redirect("/dashboard");
}
