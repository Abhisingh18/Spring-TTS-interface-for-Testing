import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { audioPath, findSample } from "@/lib/workspace/store";

export const dynamic = "force-dynamic";

/**
 * Streams an uploaded clip by sample id. The storage key never reaches the
 * browser, and range requests are honoured so seeking does not pull the whole
 * file — the same contract as the bundle audio route.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const sample = await findSample(id);
  if (!sample) return new Response("Not found", { status: 404 });

  const file = audioPath(sample.objectKey);
  if (!file) return new Response("Not found", { status: 404 });

  let size: number;
  let mtimeMs: number;
  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    size = info.size;
    mtimeMs = info.mtimeMs;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const etag = `"${size.toString(16)}-${Math.trunc(mtimeMs).toString(16)}"`;
  const headers: Record<string, string> = {
    "Content-Type": sample.mimeType || "audio/wav",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    ETag: etag,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  const range = parseRange(request.headers.get("range"), size);
  if (range === "unsatisfiable") {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  const stream = Readable.toWeb(
    createReadStream(file, { start, end }),
  ) as ReadableStream<Uint8Array>;

  return new Response(stream, {
    status: range ? 206 : 200,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}

type Range = { start: number; end: number };

function parseRange(header: string | null, size: number): Range | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart = "", rawEnd = ""] = match;
  if (rawStart === "" && rawEnd === "") return null;

  const start = rawStart === "" ? Math.max(size - Number(rawEnd), 0) : Number(rawStart);
  const end =
    rawStart === "" ? size - 1 : rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return "unsatisfiable";
  }
  return { start, end };
}
