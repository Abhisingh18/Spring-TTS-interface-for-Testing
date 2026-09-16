#!/usr/bin/env node
/**
 * Copies the portable listening bundle into the app so it can be deployed.
 *
 *   data/listening_samples.json   read at build time by src/lib/bundle.ts
 *   data/resampling_report.json
 *   public/audio/**               served straight off the CDN in production
 *
 * Run it once before the first deploy, and again whenever the bundle changes:
 *
 *   npm run sync:bundle
 *   npm run sync:bundle -- "D:\\somewhere\\portable_listening_bundle_16khz"
 *
 * Files that are already there with the same size are skipped, so re-running is
 * cheap. Nothing is ever deleted from the source bundle.
 */

import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const JSON_FILES = ["listening_samples.json", "resampling_report.json"];

const projectRoot = path.resolve(import.meta.dirname, "..");

async function main() {
  const source = await resolveSource();
  console.log(`Source bundle : ${source}`);
  console.log(`Destination   : ${projectRoot}`);

  await mkdir(path.join(projectRoot, "data"), { recursive: true });

  for (const file of JSON_FILES) {
    const from = path.join(source, file);
    const to = path.join(projectRoot, "data", file);
    await cp(from, to);
    console.log(`  data/${file}`);
  }

  const copied = await copyAudio(
    path.join(source, "audio"),
    path.join(projectRoot, "public", "audio"),
  );

  console.log(
    `\n${copied.copied} copied, ${copied.skipped} already current, ` +
      `${(copied.bytes / 1024 / 1024).toFixed(1)} MB in public/audio.`,
  );
  console.log("Ready to commit and deploy.");
}

/** CLI argument, then BUNDLE_DIR, then the sibling folder next to the app. */
async function resolveSource() {
  const candidates = [
    process.argv[2],
    process.env.BUNDLE_DIR,
    path.resolve(projectRoot, "..", "portable_listening_bundle_16khz"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(stripQuotes(candidate));
    if (await exists(path.join(resolved, "listening_samples.json"))) return resolved;
  }

  console.error(
    "Could not find the listening bundle.\n" +
      "Pass its path:  npm run sync:bundle -- \"F:\\\\spring tts\\\\portable_listening_bundle_16khz\"\n" +
      "or set BUNDLE_DIR in .env.local first.",
  );
  process.exit(1);
}

async function copyAudio(from, to) {
  const summary = { copied: 0, skipped: 0, bytes: 0 };
  const entries = await readdir(from, { withFileTypes: true });

  for (const entry of entries) {
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);

    if (entry.isDirectory()) {
      await mkdir(destination, { recursive: true });
      const nested = await copyAudio(source, destination);
      summary.copied += nested.copied;
      summary.skipped += nested.skipped;
      summary.bytes += nested.bytes;
      continue;
    }

    if (!entry.name.toLowerCase().endsWith(".wav")) continue;

    const sourceStat = await stat(source);
    summary.bytes += sourceStat.size;

    const destinationStat = await stat(destination).catch(() => null);
    if (destinationStat && destinationStat.size === sourceStat.size) {
      summary.skipped += 1;
      continue;
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
    summary.copied += 1;
  }

  return summary;
}

async function exists(target) {
  return stat(target).then(
    () => true,
    () => false,
  );
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

await main();
