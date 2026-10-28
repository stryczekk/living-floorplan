#!/usr/bin/env node
// Build the plan SVG from a house model:
//   node tools/build-svg.mjs <house.json> [out.svg] [--names names.json]
// Default output: the model's path with .svg. A furniture.svg next to the model
// (a ready SVG fragment, plan units) is inserted when present. --names: a JSON
// object overriding ids / classes / attributes (generator/names.js).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { generateSvg } from "../generator/floorplan-model.js";

const args = process.argv.slice(2);
const ni = args.indexOf("--names");
const names = ni >= 0 ? JSON.parse(readFileSync(args.splice(ni, 2)[1], "utf8")) : null;
const [src, outArg] = args;
if (!src) { console.error("usage: node tools/build-svg.mjs <house.json> [out.svg] [--names names.json]"); process.exit(2); }
const out = outArg || src.replace(/\.json$/, "") + ".svg";
const model = JSON.parse(readFileSync(src, "utf8"));
const furnPath = join(dirname(src), "furniture.svg");
const furniture = existsSync(furnPath) ? readFileSync(furnPath, "utf8") : "";
const svg = generateSvg(model, { furniture, names });
writeFileSync(out, svg);
console.log(out, svg.length, "bytes");
// floors above the ground floor: <out>-<floor id>.svg
for (const f of model.floors || []) {
  const o = out.replace(/\.svg$/, "") + "-" + f.id + ".svg", s2 = generateSvg(model, { names, floor: f.id });
  writeFileSync(o, s2);
  console.log(o, s2.length, "bytes");
}
