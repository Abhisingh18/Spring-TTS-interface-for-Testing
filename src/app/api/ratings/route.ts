import { currentListener } from "@/lib/session";
import { getStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Everything this listener has scored so far, for rehydrating a new device. */
export async function GET(): Promise<Response> {
  const listener = await currentListener();
  if (!listener) return Response.json({ ratings: [] });
  const ratings = await getStore().ratingsFor(listener.id);
  return Response.json({ ratings });
}

export async function POST(request: Request): Promise<Response> {
  const listener = await currentListener();
  if (!listener) {
    return Response.json({ error: "Sign in with your name first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const rating = parseRating(body);
  if (typeof rating === "string") {
    return Response.json({ error: rating }, { status: 400 });
  }

  await getStore().saveRating({
    participantId: listener.id,
    participantName: listener.name,
    ...rating,
    updatedAt: new Date().toISOString(),
  });

  return Response.json({ ok: true });
}

interface ParsedRating {
  pairSlug: string;
  modelKey: string;
  naturalness: number | null;
  similarity: number | null;
  note: string | null;
}

/** Returns the parsed rating, or a message explaining what was wrong with it. */
function parseRating(body: unknown): ParsedRating | string {
  if (typeof body !== "object" || body === null) return "Expected an object.";
  const input = body as Record<string, unknown>;

  const pairSlug = input.pairSlug;
  const modelKey = input.modelKey;
  if (typeof pairSlug !== "string" || !/^[a-z0-9-]{1,64}$/.test(pairSlug)) {
    return "Unknown pair.";
  }
  if (typeof modelKey !== "string" || !/^[a-z0-9_]{1,64}$/.test(modelKey)) {
    return "Unknown model.";
  }

  const naturalness = parseScore(input.naturalness);
  const similarity = parseScore(input.similarity);
  // An absent score clears that half of the rating; a present but out-of-range
  // one is a bug in the caller, not an instruction to clear it.
  if (naturalness === "invalid" || similarity === "invalid") {
    return "Scores must be whole numbers from 1 to 5, or null to clear.";
  }

  return {
    pairSlug,
    modelKey,
    naturalness,
    similarity,
    note: typeof input.note === "string" ? input.note.slice(0, 2000) : null,
  };
}

function parseScore(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    return "invalid";
  }
  return value;
}
