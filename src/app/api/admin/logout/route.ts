import { signOutAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  await signOutAdmin();
  return Response.json({ ok: true });
}
