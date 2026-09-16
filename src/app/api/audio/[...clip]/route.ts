import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { bundleDir } from "@/lib/bundle";

export const dynamic = "force-dynamic";

/**
 * Streams WAV files straight out of the portable bundle so the ~47 MB of audio
 * is never copied into the app. Supports HTTP range requests, which is what
 * lets `<audio>` seek without downloading a whole clip first.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ clip: string[] }> },
): Promise<Response> {
  const { clip } = await context.params;
  const relative = clip.map(decodeURIComponent).join("/");

  const root = bundleDir();
  const absolute = path.resolve(root, relative);
  const insideBundle = absolute.startsWith(root + path.sep);
  const segments = path.relative(root, absolute).split(path.sep);

  // Only WAV files under `audio/`, and never outside the bundle root.
  if (!insideBundle || segments[0] !== "audio" || !absolute.toLowerCase().endsWith(".wav")) {
    return new Response("Not found", { status: 404 });
  }

  let size: number;
  let mtimeMs: number;
  try {
    const info = await stat(absolute);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    size = info.size;
    mtimeMs = info.mtimeMs;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const etag = `"${size.toString(16)}-${Math.trunc(mtimeMs).toString(16)}"`;
  const baseHeaders: Record<string, string> = {
    "Content-Type": "audio/wav",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: baseHeaders });
  }

  const range = parseRange(request.headers.get("range"), size);
  if (range === "unsatisfiable") {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    });
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers: { ...baseHeaders, "Content-Length": String(size) } });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  const stream = Readable.toWeb(
    createReadStream(absolute, { start, end }),
  ) as ReadableStream<Uint8Array>;

  return new Response(stream, {
    status: range ? 206 : 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(end - start + 1),
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}

export { GET as HEAD };

type Range = { start: number; end: number };

function parseRange(header: string | null, size: number): Range | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart = "", rawEnd = ""] = match;
  if (rawStart === "" && rawEnd === "") return null;

  // `bytes=-500` means the last 500 bytes.
  const start = rawStart === "" ? Math.max(size - Number(rawEnd), 0) : Number(rawStart);
  const end = rawStart === "" ? size - 1 : rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return "unsatisfiable";
  }
  return { start, end };
}
