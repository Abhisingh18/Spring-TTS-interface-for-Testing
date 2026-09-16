import { getStore } from "@/lib/storage";
import { currentListener, isValidName, rename, signIn, signOut } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const listener = await currentListener();
  return Response.json({ listener });
}

/** Sign in, or correct the name on an existing session. */
export async function POST(request: Request): Promise<Response> {
  let name: unknown;
  try {
    ({ name } = (await request.json()) as { name?: unknown });
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof name !== "string" || !isValidName(name)) {
    return Response.json({ error: "Please use a name of 2 characters or more." }, { status: 400 });
  }

  const existing = await currentListener();
  const listener = existing ? await rename(existing, name) : await signIn(name);

  const now = new Date().toISOString();
  await getStore().upsertParticipant({
    id: listener.id,
    name: listener.name,
    createdAt: now,
    lastSeenAt: now,
  });

  return Response.json({ listener });
}

export async function DELETE(): Promise<Response> {
  await signOut();
  return Response.json({ listener: null });
}
