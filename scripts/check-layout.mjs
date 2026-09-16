import { chromium } from "playwright";

/**
 * Layout regression check: loads every route at four viewport widths and fails
 * if anything crosses the right edge of the document.
 *
 * Grep cannot see a layout bursting its container — this can, which is why it
 * exists. Run it against a dev or production server:
 *
 *   npm run check:layout                      (defaults to localhost:3000)
 *   npm run check:layout -- http://host:port
 *
 * ONLY=/route narrows it to one page at phone width while debugging.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const ROUTES = process.env.ONLY ? [process.env.ONLY] : [
  "/",
  "/start",
  "/collections",
  "/collections/arabic-vc",
  "/models",
  "/models/seedvc",
  "/samples",
  "/pairs",
  "/pairs/01-msa-msa",
  "/blind-test",
  "/results",
  "/admin",
  "/data",
  "/admin/workspace",
  "/admin/login",
];
const WIDTHS = process.env.ONLY ? [390] : [390, 768, 1280, 1920];

const browser = await chromium.launch();
const problems = [];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();

  for (const route of ROUTES) {
    const response = await page.goto(`${BASE}${route}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(250);

    const status = response?.status() ?? 0;
    if (status !== 200) {
      console.log(`${String(width).padStart(4)}px  HTTP ${status}   ${route}`);
      problems.push({ width, route, status });
      continue;
    }

    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;

      // Find the elements actually sticking out past the viewport.
      const culprits = [];
      if (overflow > 1) {
        for (const node of document.querySelectorAll("body *")) {
          const rect = node.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.right <= doc.clientWidth + 1 && rect.left >= -1) continue;

          const style = getComputedStyle(node);
          // Skip things deliberately clipped by a scroll container.
          let clipped = false;
          for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
            const overflowX = getComputedStyle(parent).overflowX;
            if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden" || overflowX === "clip") {
              clipped = true;
              break;
            }
          }
          if (clipped || style.position === "fixed") continue;

          culprits.push({
            tag: node.tagName.toLowerCase(),
            cls: (node.className?.toString?.() ?? "").slice(0, 90),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
          });
          if (culprits.length >= 8) break;
        }
      }

      return { overflow, culprits, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });

    const flag = result.overflow > 1 ? "OVERFLOW" : "ok";
    console.log(
      `${String(width).padStart(4)}px  ${flag.padEnd(9)} ${route}` +
        (result.overflow > 1 ? `  (+${result.overflow}px)` : ""),
    );
    for (const culprit of result.culprits) {
      console.log(`             ↳ <${culprit.tag}> ${culprit.left}→${culprit.right}  ${culprit.cls}`);
    }
    if (result.overflow > 1) problems.push({ width, route, overflow: result.overflow });
  }

  await context.close();
}

await browser.close();

const broken = problems.filter((entry) => entry.status !== undefined);
const overflowing = problems.filter((entry) => entry.status === undefined);

if (problems.length === 0) {
  console.log("\nPASS — every route returned 200 with no horizontal overflow");
} else {
  console.log(
    `\nFAIL — ${broken.length} non-200 response(s), ${overflowing.length} overflowing view(s)`,
  );
}

process.exitCode = problems.length === 0 ? 0 : 1;
