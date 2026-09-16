import { createHash } from "node:crypto";

import { AdminAuthError, requireAdmin } from "@/lib/admin-auth";
import { attachSample, getWorkspace, putAudio } from "@/lib/workspace/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 40 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/vnd.wave": ".wav",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
};

/**
 * Attaches one audio file to a cell: a row's source/target reference, or a
 * model's generated clip. The upload is validated, hashed and stored under a
 * generated key — the original filename is kept as metadata only.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return fail(401, "ADMIN_REQUIRED", "Administrator sign-in required.");
    }
    throw error;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "BAD_REQUEST", "Expected a multipart upload.");
  }

  const file = form.get("file");
  const collectionId = string(form.get("collectionId"));
  const itemId = string(form.get("itemId"));
  const modelId = string(form.get("modelId"));
  const role = string(form.get("role"));

  if (!(file instanceof File)) return fail(400, "NO_FILE", "No audio file was attached.");
  if (!collectionId || !itemId) return fail(400, "BAD_REQUEST", "collectionId and itemId are required.");
  if (role !== "source" && role !== "target" && role !== "generated") {
    return fail(400, "BAD_REQUEST", "role must be source, target or generated.");
  }
  if (role === "generated" && !modelId) {
    return fail(400, "BAD_REQUEST", "A generated clip needs a modelId.");
  }

  const extension = ALLOWED[file.type];
  if (!extension) {
    return fail(415, "UNSUPPORTED_TYPE", `${file.type || "That file type"} is not an accepted audio format.`);
  }
  if (file.size > MAX_BYTES) {
    return fail(413, "TOO_LARGE", `Audio must be under ${MAX_BYTES / 1024 / 1024} MB.`);
  }

  // The row and column must belong to the collection named in the request —
  // never trust the client to pair them up correctly.
  const snapshot = await getWorkspace();
  const item = snapshot.items.find((entry) => entry.id === itemId);
  if (!item || item.collectionId !== collectionId) {
    return fail(404, "ITEM_NOT_FOUND", "That row is not in this collection.");
  }
  if (modelId) {
    const model = snapshot.models.find((entry) => entry.id === modelId);
    if (!model || model.collectionId !== collectionId) {
      return fail(404, "MODEL_NOT_FOUND", "That model is not in this collection.");
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const metadata = readWavHeader(bytes);
  const objectKey = await putAudio(bytes, extension);

  const sample = await attachSample({
    collectionId,
    modelId: role === "generated" ? (modelId ?? null) : null,
    itemId,
    role,
    objectKey,
    filename: file.name.slice(0, 200),
    mimeType: file.type,
    size: bytes.byteLength,
    sha256,
    durationSec: metadata?.durationSec ?? null,
    sampleRate: metadata?.sampleRate ?? null,
  });

  return Response.json({ sample }, { status: 201 });
}

function string(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Sample rate and duration straight out of the WAV header. ffprobe will replace
 * this once the processing worker lands; until then it covers the common case
 * without shelling out.
 */
function readWavHeader(bytes: Buffer): { sampleRate: number; durationSec: number } | null {
  if (bytes.length < 44) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }

  let offset = 12;
  let sampleRate = 0;
  let byteRate = 0;

  while (offset + 8 <= bytes.length) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);

    if (id === "fmt " && offset + 8 + 16 <= bytes.length) {
      sampleRate = bytes.readUInt32LE(offset + 12);
      byteRate = bytes.readUInt32LE(offset + 16);
    } else if (id === "data" && byteRate > 0) {
      return { sampleRate, durationSec: Math.round((size / byteRate) * 1000) / 1000 };
    }

    // Chunks are word-aligned.
    offset += 8 + size + (size % 2);
  }

  return sampleRate > 0 ? { sampleRate, durationSec: 0 } : null;
}

function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
