import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Lets the client chrome know whether to show the management navigation.
 * It is a hint for the UI only — every management page and write re-checks
 * server-side, so a forged answer here gains nothing.
 */
export async function GET(): Promise<Response> {
  return Response.json({ admin: await isAdmin() });
}
