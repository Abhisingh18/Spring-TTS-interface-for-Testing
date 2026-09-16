/**
 * End-to-end check of the admin credential gate and the management flow.
 *
 * Every write on the management side must be closed to an anonymous caller and
 * open to a signed-in administrator — the kind of thing that is easy to break
 * and impossible to see by reading a page. Run it against a running server:
 *
 *   npm run check:admin
 *
 * It creates a throwaway collection and deletes it again, so it is safe to run
 * against a development instance. It needs the default credential, so set
 * ADMIN_PASSWORD only after you stop relying on this check.
 */
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
let cookie = "";
let failures = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok " : "FAIL "} ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
}

async function call(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${BASE}${path}`, { ...options, headers, redirect: "manual" });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return response;
}

async function json(path, method, body) {
  return call(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

console.log("\n1. signed out — management must be closed");
check("POST /api/v1/collections", (await json("/api/v1/collections", "POST", { name: "Sneaky" })).status, 401);
check("GET  /api/admin/export", (await call("/api/admin/export?format=json")).status, 401);
const gate = await call("/admin/workspace");
check("workspace shows sign-in", (await gate.text()).includes("Administrator sign-in"), true);

console.log("\n2. wrong credentials");
check("wrong password", (await json("/api/admin/login", "POST", { email: "admin@spring.com", password: "nope" })).status, 401);
check("wrong email", (await json("/api/admin/login", "POST", { email: "nobody@else.com", password: "spring-admin" })).status, 401);
check("still closed", (await json("/api/v1/collections", "POST", { name: "Sneaky" })).status, 401);

console.log("\n3. correct credentials");
check("login", (await json("/api/admin/login", "POST", { email: "admin@spring.com", password: "spring-admin" })).status, 200);
check("export now open", (await call("/api/admin/export?format=json")).status, 200);

console.log("\n4. create a collection");
const created = await json("/api/v1/collections", "POST", {
  name: "Kannada TTS benchmark",
  language: "Kannada",
  languageNative: "ಕನ್ನಡ",
  task: "TTS",
  description: "Four systems on the same fifty utterances.",
});
check("POST collection", created.status, 201);
const { collection } = await created.json();
console.log(`       id ${collection.id}`);

console.log("\n5. add two model columns");
const modelIds = [];
for (const [name, version] of [["XEUS", "v1.2"], ["Whisper", "large-v3"]]) {
  const response = await json(`/api/v1/collections/${collection.id}`, "PATCH", {
    action: "add-model",
    name,
    version,
  });
  check(`add model ${name}`, response.status, 201);
  modelIds.push((await response.json()).model.id);
}

console.log("\n6. add a row");
const itemResponse = await json(`/api/v1/collections/${collection.id}`, "PATCH", {
  action: "add-item",
  label: "kn_test_0001",
  transcript: "ಇದು ಒಂದು ಪರೀಕ್ಷೆ",
});
check("add item", itemResponse.status, 201);
const itemId = (await itemResponse.json()).item.id;

console.log("\n7. upload a clip into each cell");
const wav = readFileSync("public/audio/01_MSA-MSA/source_audio.wav");
async function upload(role, modelId) {
  const form = new FormData();
  form.set("file", new File([wav], "clip.wav", { type: "audio/wav" }));
  form.set("collectionId", collection.id);
  form.set("itemId", itemId);
  form.set("role", role);
  if (modelId) form.set("modelId", modelId);
  return call("/api/v1/samples", { method: "POST", body: form });
}

const sourceUpload = await upload("source", null);
check("upload source reference", sourceUpload.status, 201);
const sourceSample = (await sourceUpload.json()).sample;
console.log(`       ${sourceSample.sampleRate} Hz · ${sourceSample.durationSec}s · sha ${sourceSample.sha256.slice(0, 12)}`);

for (const [index, modelId] of modelIds.entries()) {
  check(`upload model ${index + 1} clip`, (await upload("generated", modelId)).status, 201);
}

console.log("\n8. audio streams back by sample id");
const audio = await call(`/api/v1/samples/${sourceSample.id}/audio`);
check("GET audio", audio.status, 200);
check("content-length", audio.headers.get("content-length"), String(wav.byteLength));
const ranged = await call(`/api/v1/samples/${sourceSample.id}/audio`, { headers: { Range: "bytes=0-999" } });
check("range request", ranged.status, 206);

console.log("\n9. validation");
const badForm = new FormData();
badForm.set("file", new File([Buffer.from("not audio")], "x.txt", { type: "text/plain" }));
badForm.set("collectionId", collection.id);
badForm.set("itemId", itemId);
badForm.set("role", "source");
check("rejects non-audio", (await call("/api/v1/samples", { method: "POST", body: badForm })).status, 415);

const wrongItem = new FormData();
wrongItem.set("file", new File([wav], "clip.wav", { type: "audio/wav" }));
wrongItem.set("collectionId", collection.id);
wrongItem.set("itemId", "itm_does_not_exist");
wrongItem.set("role", "source");
check("rejects foreign row", (await call("/api/v1/samples", { method: "POST", body: wrongItem })).status, 404);

console.log("\n10. the matrix renders");
const page = await call(`/admin/workspace/${collection.id}`);
const html = await page.text();
check("page 200", page.status, 200);
check("shows both models", html.includes("XEUS") && html.includes("Whisper"), true);
check("shows the row", html.includes("kn_test_0001"), true);
check("shows the transcript", html.includes("ಇದು ಒಂದು ಪರೀಕ್ಷೆ"), true);
check("has audio players", html.includes(`/api/v1/samples/${sourceSample.id}/audio`), true);

console.log("\n11. draft is hidden from members");
const asMember = await fetch(`${BASE}/api/v1/collections`);
const memberView = await asMember.json();
check("member sees no drafts", memberView.collections.length, 0);

console.log("\n12. publish, then clean up");
check("publish", (await json(`/api/v1/collections/${collection.id}`, "PATCH", { action: "update", status: "published" })).status, 200);
const published = await (await fetch(`${BASE}/api/v1/collections`)).json();
check("member sees it now", published.collections.length, 1);
check("delete collection", (await call(`/api/v1/collections/${collection.id}`, { method: "DELETE" })).status, 200);
check("audio gone with it", (await call(`/api/v1/samples/${sourceSample.id}/audio`)).status, 404);

console.log(`\n${failures === 0 ? "PASS — admin gate and management flow both work" : `FAIL — ${failures} check(s) failed`}`);
process.exitCode = failures === 0 ? 0 : 1;
