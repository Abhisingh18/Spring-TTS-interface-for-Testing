import { getBundle } from "@/lib/bundle";
import { isAdmin } from "@/lib/session";
import { getStore, storeDescription } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Full submission dump: `?format=json` (default) or `?format=csv`. */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAdmin())) {
    return Response.json({ error: "Enter the admin passcode first." }, { status: 401 });
  }

  const snapshot = await getStore().snapshot();
  const { pairs, models } = await getBundle();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const format = new URL(request.url).searchParams.get("format");

  if (format === "csv") {
    return new Response(toCsv(snapshot.ratings), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listening-ratings-${stamp}.csv"`,
      },
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    storage: storeDescription(),
    bundle: {
      pairs: pairs.map(({ slug, name, sourceCorpus, targetCorpus }) => ({
        slug,
        name,
        sourceCorpus,
        targetCorpus,
      })),
      models: models.map(({ key, label }) => ({ key, label })),
    },
    participants: snapshot.participants,
    ratings: snapshot.ratings,
    feedback: snapshot.feedback,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="listening-submissions-${stamp}.json"`,
    },
  });
}

function toCsv(ratings: Awaited<ReturnType<ReturnType<typeof getStore>["snapshot"]>>["ratings"]) {
  const rows = [
    ["participant", "participant_id", "pair", "model", "naturalness", "similarity", "note", "updated_at"],
    ...ratings.map((rating) => [
      rating.participantName,
      rating.participantId,
      rating.pairSlug,
      rating.modelKey,
      rating.naturalness?.toString() ?? "",
      rating.similarity?.toString() ?? "",
      rating.note ?? "",
      rating.updatedAt,
    ]),
  ];
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
