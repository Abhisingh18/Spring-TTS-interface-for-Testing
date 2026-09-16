import { AdminAuthError, requireAdmin } from "@/lib/admin-auth";
import {
  addItem,
  addModel,
  deleteCollection,
  deleteItem,
  deleteModel,
  getWorkspace,
  updateCollection,
} from "@/lib/workspace/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const snapshot = await getWorkspace();
  const collection = snapshot.collections.find((entry) => entry.id === id);
  if (!collection) return notFound();

  return Response.json({
    collection,
    models: snapshot.models.filter((model) => model.collectionId === id).sort(byOrder),
    items: snapshot.items.filter((item) => item.collectionId === id).sort(byOrder),
    samples: snapshot.samples.filter((sample) => sample.collectionId === id),
  });
}

/**
 * One endpoint for the collection's own edits and for adding or removing the
 * rows and columns inside it, selected by `action`.
 */
export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) return unauthorised();
    throw error;
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Expected a JSON body.");
  }

  const action = typeof body.action === "string" ? body.action : "update";

  switch (action) {
    case "update": {
      const patch: Record<string, unknown> = {};
      for (const key of ["name", "language", "languageNative", "task", "description"] as const) {
        const value = text(body[key], key === "description" ? 2000 : 120);
        if (value !== undefined) patch[key] = value;
      }
      if (body.status === "draft" || body.status === "published") patch.status = body.status;

      const collection = await updateCollection(id, patch);
      return collection ? Response.json({ collection }) : notFound();
    }

    case "add-model": {
      const name = text(body.name, 120);
      if (!name) return badRequest("A model needs a name.");
      const model = await addModel({
        collectionId: id,
        name,
        version: text(body.version, 60) ?? "v1",
        notes: text(body.notes, 1000),
      });
      return Response.json({ model }, { status: 201 });
    }

    case "add-item": {
      const label = text(body.label, 200);
      if (!label) return badRequest("A row needs a label.");
      const item = await addItem({
        collectionId: id,
        label,
        transcript: text(body.transcript, 4000),
      });
      return Response.json({ item }, { status: 201 });
    }

    case "delete-model": {
      const modelId = text(body.modelId, 80);
      if (!modelId) return badRequest("Which model?");
      await deleteModel(modelId);
      return Response.json({ ok: true });
    }

    case "delete-item": {
      const itemId = text(body.itemId, 80);
      if (!itemId) return badRequest("Which row?");
      await deleteItem(itemId);
      return Response.json({ ok: true });
    }

    default:
      return badRequest(`Unknown action "${action}".`);
  }
}

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) return unauthorised();
    throw error;
  }

  const { id } = await params;
  await deleteCollection(id);
  return Response.json({ ok: true });
}

function byOrder(a: { order: number }, b: { order: number }): number {
  return a.order - b.order;
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : undefined;
}

function badRequest(message: string): Response {
  return Response.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

function notFound(): Response {
  return Response.json(
    { error: { code: "COLLECTION_NOT_FOUND", message: "That collection does not exist." } },
    { status: 404 },
  );
}

function unauthorised(): Response {
  return Response.json(
    { error: { code: "ADMIN_REQUIRED", message: "Administrator sign-in required." } },
    { status: 401 },
  );
}
