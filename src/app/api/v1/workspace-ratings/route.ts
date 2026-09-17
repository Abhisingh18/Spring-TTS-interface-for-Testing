import { currentListener } from "@/lib/session";
import { getWorkspace, rateWorkspaceSample } from "@/lib/workspace/store";

export const dynamic = "force-dynamic";

/** This listener's own ratings, optionally narrowed to one collection. */
export async function GET(request: Request): Promise<Response> {
  const listener = await currentListener();
  if (!listener) return Response.json({ ratings: [] });

  const collectionId = new URL(request.url).searchParams.get("collectionId");
  const snapshot = await getWorkspace();
  const ratings = snapshot.ratings.filter(
    (rating) =>
      rating.participantId === listener.id &&
      (!collectionId || rating.collectionId === collectionId),
  );

  return Response.json({ ratings });
}

export async function POST(request: Request): Promise<Response> {
  const listener = await currentListener();
  if (!listener) {
    return Response.json(
      { error: { code: "SIGN_IN_REQUIRED", message: "Sign in with your name first." } },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "BAD_REQUEST", "Expected a JSON body.");
  }

  const collectionId = str(body.collectionId);
  const itemId = str(body.itemId);
  const modelId = str(body.modelId);
  if (!collectionId || !itemId || !modelId) {
    return fail(400, "BAD_REQUEST", "collectionId, itemId and modelId are required.");
  }

  const naturalness = score(body.naturalness);
  const similarity = score(body.similarity);
  if (naturalness === "invalid" || similarity === "invalid") {
    return fail(400, "BAD_REQUEST", "Scores must be whole numbers from 1 to 5, or null to clear.");
  }

  // The cell must actually exist and belong together — never trust the client
  // to have paired collection/item/model correctly.
  const snapshot = await getWorkspace();
  const item = snapshot.items.find((entry) => entry.id === itemId);
  const model = snapshot.models.find((entry) => entry.id === modelId);
  if (!item || item.collectionId !== collectionId) {
    return fail(404, "ITEM_NOT_FOUND", "That row is not in this collection.");
  }
  if (!model || model.collectionId !== collectionId) {
    return fail(404, "MODEL_NOT_FOUND", "That model is not in this collection.");
  }
  const collection = snapshot.collections.find((entry) => entry.id === collectionId);
  if (!collection || collection.status !== "published") {
    return fail(404, "COLLECTION_NOT_FOUND", "That collection is not open yet.");
  }

  const rating = await rateWorkspaceSample({
    collectionId,
    itemId,
    modelId,
    participantId: listener.id,
    participantName: listener.name,
    naturalness,
    similarity,
    note: typeof body.note === "string" ? body.note.slice(0, 2000) : null,
  });

  return Response.json({ rating });
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function score(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    return "invalid";
  }
  return value;
}

function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
