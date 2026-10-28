// The floor plan card's browser tests in WebKit (Safari's engine), as an iPhone and as an iPad.
//   node run-webkit.mjs <repo dir>
import { webkit, devices } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const ROOT = process.argv[2];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css" };
const srv = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(8770, "127.0.0.1");
const browser = await webkit.launch();
let fail = 0;
for (const [name, dev] of [["iPhone 13", devices["iPhone 13"]], ["iPad (gen 7)", devices["iPad (gen 7)"]]]) {
  const ctx = await browser.newContext({ ...dev, timezoneId: "Europe/Warsaw" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8770/tests/browser/harness.html");
  await page.waitForFunction(() => !/^RUNNING/.test(document.getElementById("results")?.textContent || "RUNNING") , null, { timeout: 120000 }).catch(() => {});
  const out = await page.evaluate(() => document.getElementById("results")?.textContent || "");
  const failed = out.split("\n").filter((l) => /^FAIL|^ERROR/.test(l));
  console.log(`${name}: ${out.split("\n").pop()}`);
  for (const l of failed) console.log("   " + l);
  for (const e of errors) console.log("   page error: " + e);
  if (!/^OK/.test(out.split("\n").pop())) fail++;
  // a shot of the card on the phone
  const shot = await ctx.newPage();
  await shot.goto("http://127.0.0.1:8770/tests/browser/harness.html?shot=phone");
  await shot.waitForTimeout(2500);
  await shot.screenshot({ path: `/tmp/claude-0/-root-claude/ecc10184-3729-5e45-a985-3d0ba2f6a0f9/scratchpad/webkit-${name.replace(/\W+/g, "-")}.png` });
  await ctx.close();
}
await browser.close();
srv.close();
process.exit(fail ? 1 : 0);
