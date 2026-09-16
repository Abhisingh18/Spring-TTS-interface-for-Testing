import { grantAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let passcode: unknown;
  try {
    ({ passcode } = (await request.json()) as { passcode?: unknown });
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof passcode !== "string" || !(await grantAdmin(passcode))) {
    return Response.json({ error: "That passcode does not match." }, { status: 401 });
  }

  return Response.json({ ok: true });
}
