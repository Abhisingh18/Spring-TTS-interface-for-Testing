import { signInAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = (await request.json()) as { email?: unknown; password?: unknown });
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Expected a JSON body." } }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Email and password are required." } },
      { status: 400 },
    );
  }

  const result = await signInAdmin(email, password);
  if (!result.ok) {
    return Response.json({ error: { code: "INVALID_CREDENTIALS", message: result.error } }, { status: 401 });
  }
  return Response.json({ ok: true });
}
