#!/usr/bin/env node
// The editor with saving on the server: serves the editor and keeps the plan,
// its versions and the built SVG in a data directory. No dependencies.
//
//   node tools/serve.mjs --data <dir> [--port 8090] [--host 127.0.0.1]
//                        [--names names.json] [--svg <out.svg>]
//
// <dir>/house.json        the current plan (the latest version)
// <dir>/furniture.svg     optional, inserted into the SVG
// <dir>/versions/v<N>.json and versions/index.json  every saved version
// --svg                   where the SVG is built on every save (default <dir>/plan.svg; floors
//                         above the ground: <svg>-<floor id>.svg)
// --names                 a name table for the SVG (generator/names.js)
//
// Anyone who can reach the port can save: keep it on a trusted network.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join, dirname, resolve, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSvg } from "../generator/floorplan-model.js";
import { prettyJson } from "../editor/json-pretty.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATIC = ["editor", "generator", "examples", "view3d"]; // the only directories served (view3d: the house in 3D, built by house3d)
const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : def; };
// --publish: the editor gets a "Send to Home Assistant" button. The server only leaves a request file in the
// data directory; something with the rights to reach Home Assistant (a systemd path unit, a cron job) picks it
// up, sends the plan and writes publish-result.json { at, ok, version, message } back.
const PUBLISH = process.argv.includes("--publish");
const DATA = resolve(arg("data", "") || (() => { console.error("usage: node tools/serve.mjs --data <dir> [...]"); process.exit(2); })());
const PORT = Number(arg("port", 8090)), HOST = arg("host", "127.0.0.1");
const NAMES = arg("names") ? JSON.parse(readFileSync(arg("names"), "utf8")) : null;
const SVG = resolve(arg("svg", join(DATA, "plan.svg")));
const PLAN = join(DATA, "house.json"), FURN = join(DATA, "furniture.svg");
const VDIR = join(DATA, "versions"), INDEX = join(VDIR, "index.json");

const read = (p) => readFileSync(p, "utf8");
// write via a temporary file: a reader never sees half a plan
function write(p, text) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p + ".tmp", text);
  renameSync(p + ".tmp", p);
}
function index() {
  if (existsSync(INDEX)) return JSON.parse(read(INDEX));
  // a plan saved before versions existed becomes version 1
  if (!existsSync(PLAN)) return { current: null, versions: [] };
  const ix = { current: "v1", versions: [{ id: "v1", saved: statSync(PLAN).mtime.toISOString(), note: "" }] };
  write(join(VDIR, "v1.json"), read(PLAN));
  write(INDEX, prettyJson(ix) + "\n");
  return ix;
}
// the ground floor to --svg; every floor above to <svg>-<floor id>.svg next to it
function build(model) {
  const furniture = existsSync(FURN) ? read(FURN) : "";
  write(SVG, generateSvg(model, { furniture, names: NAMES }));
  for (const f of model.floors || []) write(SVG.replace(/\.svg$/, "") + "-" + f.id + ".svg", generateSvg(model, { names: NAMES, floor: f.id }));
}

function save({ model, mode, note, base }) {
  if (!model || model.version !== 2) throw Object.assign(new Error("not a version 2 plan"), { code: 400 });
  const ix = index();
  const now = new Date().toISOString();
  let v;
  if (mode === "new" || !ix.current) {
    const n = ix.versions.reduce((m, x) => Math.max(m, Number(x.id.slice(1)) || 0), 0) + 1;
    v = { id: "v" + n, saved: now, note: String(note || "").slice(0, 200) };
    ix.versions.push(v);
    ix.current = v.id;
  } else {
    // overwrite: only the latest version, and only the one the editor started from
    if (base !== ix.current) throw Object.assign(new Error(`the plan was saved meanwhile as ${ix.current}`), { code: 409, current: ix.current });
    v = ix.versions.find((x) => x.id === ix.current);
    v.saved = now;
    if (note !== undefined && note !== null && note !== "") v.note = String(note).slice(0, 200);
  }
  const text = prettyJson(model) + "\n";
  write(join(VDIR, v.id + ".json"), text);
  write(PLAN, text);
  write(INDEX, prettyJson(ix) + "\n");
  build(model);
  return { version: v, versions: ix.versions };
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type + "; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const path = decodeURIComponent(url.pathname);
  try {
    if (path === "/api/plan" && req.method === "GET") {
      const ix = index();
      return send(res, 200, {
        model: existsSync(PLAN) ? JSON.parse(read(PLAN)) : null,
        furniture: existsSync(FURN) ? read(FURN) : "",
        names: NAMES, version: ix.versions.find((x) => x.id === ix.current) || null, versions: ix.versions,
      });
    }
    const vm = path.match(/^\/api\/versions\/(v\d+)$/);
    if (vm && req.method === "GET") {
      const p = join(VDIR, vm[1] + ".json");
      return existsSync(p) ? send(res, 200, read(p)) : send(res, 404, { error: "no such version" });
    }
    const REQ = join(DATA, "publish-request.json"), RES = join(DATA, "publish-result.json");
    if (path === "/api/publish" && req.method === "GET") {
      return send(res, 200, { available: PUBLISH, pending: PUBLISH && existsSync(REQ), last: PUBLISH && existsSync(RES) ? JSON.parse(read(RES)) : null });
    }
    if (path === "/api/publish" && req.method === "POST") {
      if (!PUBLISH) return send(res, 404, { error: "publishing is not set up" });
      const at = new Date().toISOString();
      writeFileSync(REQ, JSON.stringify({ at, version: index().current }));
      return send(res, 202, { at });
    }
    if (path === "/api/svg" && req.method === "GET") {
      return existsSync(SVG) ? send(res, 200, read(SVG), "image/svg+xml") : send(res, 404, { error: "not built yet" });
    }
    if (path === "/api/save" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => { body += c; if (body.length > 20e6) req.destroy(); });
      req.on("end", () => {
        try { send(res, 200, save(JSON.parse(body))); }
        catch (e) { send(res, e.code || 500, { error: e.message, current: e.current }); }
      });
      return;
    }
    if (path === "/") { res.writeHead(302, { Location: "/editor/" }); return res.end(); }
    // static files: only the editor, the generator and the examples
    const rel = normalize(path).replace(/^[/\\]+/, "");
    const top = rel.split(/[/\\]/)[0];
    let file = join(ROOT, rel);
    if (!STATIC.includes(top) || !file.startsWith(ROOT)) return send(res, 404, { error: "not found" });
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) return send(res, 404, { error: "not found" });
    send(res, 200, readFileSync(file), TYPES[extname(file)] || "application/octet-stream");
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(PORT, HOST, () => console.log(`floor plan editor: http://${HOST}:${PORT}/  data: ${DATA}`));
