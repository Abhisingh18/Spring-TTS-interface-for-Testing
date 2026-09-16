import { chromium } from "playwright";

/**
 * Role separation, measured in a real browser.
 *
 * The sidebar decides what to offer from a client-side session lookup, so the
 * server HTML deliberately starts with the member navigation — a member must
 * never see management links flash. That swap only happens after hydration,
 * which curl cannot observe, hence this check.
 *
 *   npm run check:roles
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const MEMBER_ONLY = ["My dashboard", "My files"];
const ADMIN_ONLY = ["Models", "Samples", "Blind test", "Everyone's ratings", "Bundle data"];

let failures = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "  ok " : "FAIL "} ${label}` +
      (ok ? "" : `\n        got      ${JSON.stringify(actual)}\n        expected ${JSON.stringify(expected)}`),
  );
}

const browser = await chromium.launch();

async function navLabels(context, path) {
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  // Wait for the session lookup to settle the navigation.
  await page.waitForTimeout(600);
  const labels = await page.$$eval('nav[aria-label="Studio"] a span.truncate', (nodes) =>
    nodes.map((node) => node.textContent?.trim()).filter(Boolean),
  );
  await page.close();
  return labels;
}

console.log("\nmember — signed in with a name only");
const member = await browser.newContext();
await member.request.post(`${BASE}/api/session`, { data: { name: "Ravi" } });
const memberNav = await navLabels(member, "/dashboard");
check("navigation offers exactly two items", memberNav, MEMBER_ONLY);
for (const label of ADMIN_ONLY) {
  check(`does not offer "${label}"`, memberNav.includes(label), false);
}

console.log("\nadmin — signed in with the credential");
const admin = await browser.newContext();
await admin.request.post(`${BASE}/api/admin/login`, {
  data: { email: "admin@spring.com", password: "spring-admin" },
});
const adminNav = await navLabels(admin, "/collections");
for (const label of ADMIN_ONLY) {
  check(`offers "${label}"`, adminNav.includes(label), true);
}
check("offers the pair list too", adminNav.includes("MSA-MSA"), true);

await member.close();
await admin.close();
await browser.close();

console.log(`\n${failures === 0 ? "PASS — member and admin see different navigation" : `FAIL — ${failures} check(s) failed`}`);
process.exitCode = failures === 0 ? 0 : 1;
