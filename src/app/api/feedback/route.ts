import { currentListener } from "@/lib/session";
import { getStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const listener = await currentListener();
  if (!listener) {
    return Response.json({ error: "Sign in with your name first." }, { status: 401 });
  }

  let text: unknown;
  try {
    ({ text } = (await request.json()) as { text?: unknown });
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json({ error: "Write something first." }, { status: 400 });
  }

  await getStore().saveFeedback({
    participantId: listener.id,
    participantName: listener.name,
    text: text.trim().slice(0, 4000),
    updatedAt: new Date().toISOString(),
  });

  return Response.json({ ok: true });
}
