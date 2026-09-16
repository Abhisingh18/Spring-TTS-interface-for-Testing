import { isAdmin, requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createCollection, getWorkspace } from "@/lib/workspace/store";

export const dynamic = "force-dynamic";

/** Members see published collections; an administrator sees drafts too. */
export async function GET(): Promise<Response> {
  const snapshot = await getWorkspace();
  const admin = await isAdmin();
  const collections = admin
    ? snapshot.collections
    : snapshot.collections.filter((collection) => collection.status === "published");

  return Response.json({
    collections: collections.map((collection) => ({
      ...collection,
      modelCount: snapshot.models.filter((model) => model.collectionId === collection.id).length,
      itemCount: snapshot.items.filter((item) => item.collectionId === collection.id).length,
      sampleCount: snapshot.samples.filter((sample) => sample.collectionId === collection.id).length,
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) return unauthorised();
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Expected a JSON body.");
  }

  const name = text(body.name, 120);
  if (!name) return badRequest("A collection needs a name.");

  const collection = await createCollection({
    name,
    language: text(body.language, 60) ?? "Unspecified",
    languageNative: text(body.languageNative, 60) ?? undefined,
    task: text(body.task, 60) ?? "Other",
    description: text(body.description, 2000) ?? "",
  });

  return Response.json({ collection }, { status: 201 });
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : undefined;
}

function badRequest(message: string): Response {
  return Response.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

function unauthorised(): Response {
  return Response.json(
    { error: { code: "ADMIN_REQUIRED", message: "Administrator sign-in required." } },
    { status: 401 },
  );
}
