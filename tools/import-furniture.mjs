#!/usr/bin/env node
// Carry a ready furniture fragment (SVG, plan units) into the model as pieces:
//   node tools/import-furniture.mjs <house.json> <furniture.svg> [out.json]
// Every top-level <g id=...> becomes a "custom" piece with its own drawing, its
// middle (`at`, `origin`) and size measured in headless Chromium, its room from
// the position, and the comments in front of it as its `note`. A <style> goes
// with the piece that uses its class. The plan looks the same; the pieces can
// then be moved and turned in the editor. Default output: house.json itself.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { prettyJson } from "../editor/json-pretty.js";
import { roomOf } from "../editor/devices.js";
import { CM_PER_SVG_DEFAULT } from "../generator/model-v2.js";

const [src, furn, out = src] = process.argv.slice(2);
if (!furn) { console.error("usage: node tools/import-furniture.mjs <house.json> <furniture.svg> [out.json]"); process.exit(2); }
const model = JSON.parse(readFileSync(src, "utf8"));
const text = readFileSync(furn, "utf8");

// the inside of the outer <g id="furniture" ...> ... </g>
const open = text.match(/<g\s+id="furniture"[^>]*>/);
if (!open) throw new Error("no <g id=\"furniture\"> in " + furn);
const body = text.slice(open.index + open[0].length, text.lastIndexOf("</g>"));

// top-level children: comments, <style>, <g ...>...</g> (nested groups counted)
const parts = [];
let i = 0;
while (i < body.length) {
  const rest = body.slice(i);
  const ws = rest.match(/^\s+/);
  if (ws) { i += ws[0].length; continue; }
  if (rest.startsWith("<!--")) { const e = body.indexOf("-->", i); parts.push({ type: "comment", text: body.slice(i + 4, e).trim() }); i = e + 3; continue; }
  if (rest.startsWith("<style")) { const e = body.indexOf("</style>", i) + 8; parts.push({ type: "style", text: body.slice(i, e) }); i = e; continue; }
  if (rest.startsWith("<g")) {
    let depth = 0, j = i;
    const re = /<g\b[^>]*?(\/?)>|<\/g>/g;
    re.lastIndex = i;
    for (let m; (m = re.exec(body));) {
      if (m[0] === "</g>") depth--; else if (!m[1]) depth++;
      if (depth === 0) { j = re.lastIndex; break; }
    }
    const svg = body.slice(i, j);
    parts.push({ type: "g", id: svg.match(/^<g\b[^>]*\bid="([^"]+)"/)?.[1], svg });
    i = j;
    continue;
  }
  throw new Error("unexpected markup in the furniture: " + rest.slice(0, 60));
}

// sizes and middles as drawn (with each group's own transform), in Chromium
const groups = parts.filter((p) => p.type === "g");
if (groups.some((g) => !g.id)) throw new Error("a top-level <g> without an id");
const dir = mkdtempSync(join(tmpdir(), "furniture-"));
writeFileSync(join(dir, "m.html"), `<!doctype html><svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000">${text}</svg>
<pre id="out"></pre><script>
const r = {};
for (const g of document.querySelectorAll("#furniture > g")) {
  const b = g.getBBox(), m = g.transform.baseVal.consolidate();
  const M = m ? m.matrix : new DOMMatrix();
  const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
    .map(([x, y]) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  r[g.id] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
document.getElementById("out").textContent = JSON.stringify(r);
</script>`);
const dom = execFileSync("chromium", ["--headless", "--no-sandbox", "--disable-gpu", `--user-data-dir=${join(dir, "p")}`,
  "--virtual-time-budget=3000", "--dump-dom", "file://" + join(dir, "m.html")], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
rmSync(dir, { recursive: true, force: true });
const boxes = JSON.parse(dom.match(/<pre id="out">([^<]*)<\/pre>/)[1].replace(/&quot;/g, '"'));

const cm = model.canvas.cm_per_svg || CM_PER_SVG_DEFAULT;
const r2 = (v) => Math.round(v * 100) / 100;
const pieces = [];
let notes = [];
const styles = parts.filter((p) => p.type === "style");
for (const p of parts) {
  if (p.type === "comment") { notes.push(p.text.replace(/\n\s+/g, "\n")); continue; }
  if (p.type !== "g") continue;
  const [x0, y0, x1, y1] = boxes[p.id];
  const at = [r2(((x0 + x1) / 2) * cm), r2(((y0 + y1) / 2) * cm)];
  let svg = p.svg;
  // a <style> goes into the group that uses one of its classes
  for (const s of styles) {
    const cls = [...s.text.matchAll(/\.([\w-]+)\s*[{,]/g)].map((m) => m[1]);
    if (!s.used && cls.some((c) => svg.includes(`class="${c}"`))) { svg = svg.replace(/>/, ">\n      " + s.text.trim().replace(/\n\s*/g, "\n      ")); s.used = true; }
  }
  const piece = { id: p.id, kind: "custom", at, origin: at, size: [r2((x1 - x0) * cm), r2((y1 - y0) * cm)] };
  const room = roomOf(model, at);
  if (room) piece.room = room;
  if (notes.length) piece.note = notes.join("\n\n");
  piece.svg = svg;
  pieces.push(piece);
  notes = [];
}
if (notes.length && pieces.length) pieces[pieces.length - 1].note = [pieces[pieces.length - 1].note, ...notes].filter(Boolean).join("\n\n");
if (styles.some((s) => !s.used)) console.warn("a <style> used by no piece was dropped");
model.furniture = pieces;
writeFileSync(out, prettyJson(model) + "\n");
console.log(out, pieces.length, "pieces");
