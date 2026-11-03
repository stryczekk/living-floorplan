// The demo page on its own, with a visit counter of its own (no cookies, no IP kept, no third parties):
//   DEMO_STATS_TOKEN=... node demo/server.mjs [--port 8080] [--root dist] [--data /var/lib/demo]
// Serves the demo (index.html = dist/living-floorplan-demo.html), takes the page's beacons at POST /hit (a visit's
// start, a "still here" every 15 s while the tab is visible, what was clicked) into <data>/hits.jsonl, and shows
// what they add up to at /stats?t=<token> (and /stats.json?t=<token>).
import { createServer } from "node:http";
import { readFileSync, existsSync, appendFileSync, mkdirSync, statSync, createReadStream } from "node:fs";
import { join, resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : def; };
const PORT = Number(arg("port", process.env.PORT || 8080));
const ROOT = resolve(arg("root", "dist"));
const DATA = resolve(arg("data", process.env.DEMO_DATA || "demo-data"));
const TOKEN = process.env.DEMO_STATS_TOKEN || "";
const HITS = join(DATA, "hits.jsonl");
const MAX_FILE = 200e6; // stop writing past this (a flood), the page keeps working
mkdirSync(DATA, { recursive: true });

// the page, told where to send its beacons
const PAGE = () => {
  const f = existsSync(join(ROOT, "index.html")) ? join(ROOT, "index.html") : join(ROOT, "living-floorplan-demo.html");
  return readFileSync(f, "utf8").replace("<head>", '<head>\n<meta name="demo-hits" content="hit">');
};

// ---- the beacons ----
const KINDS = new Set(["start", "ping", "event"]);
const last = new Map(); // visit -> last write (ms): one beacon a second at most
function hit(body) {
  let h;
  try { h = JSON.parse(body); } catch { return false; }
  if (!h || !KINDS.has(h.k) || typeof h.v !== "string" || !/^[a-z0-9]{8,32}$/.test(h.v)) return false;
  const now = Date.now();
  if (now - (last.get(h.v) || 0) < 900) return false;
  last.set(h.v, now);
  if (last.size > 50000) last.clear();
  const row = { t: now, v: h.v, k: h.k };
  if (h.k === "start") {
    // where from: the other site's host only; what: phone or not, the page's language
    row.ref = typeof h.ref === "string" ? h.ref.toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 80) : "";
    row.m = h.m ? 1 : 0;
    row.l = /^[a-z]{2}$/.test(h.l || "") ? h.l : "";
    row.b = ["chrome", "safari", "firefox", "edge", "samsung", "opera", "other"].includes(h.b) ? h.b : "other";
    row.w = ["<480", "480-767", "768-1279", "1280-1919", "1920+"].includes(h.w) ? h.w : "";
    row.vl = /^[a-z]{2}$/.test(h.vl || "") ? h.vl : "";
  }
  if (h.k === "event") {
    if (typeof h.n !== "string" || !/^[a-z0-9_:.-]{1,48}$/.test(h.n)) return false;
    row.n = h.n;
  }
  try { if (!existsSync(HITS) || statSync(HITS).size < MAX_FILE) appendFileSync(HITS, JSON.stringify(row) + "\n"); } catch { /* full disk */ }
  return true;
}

// ---- what they add up to (the last 30 days) ----
function stats(days = 30) {
  const from = Date.now() - days * 864e5, visits = new Map(), events = new Map();
  if (existsSync(HITS)) for (const line of readFileSync(HITS, "utf8").split("\n")) {
    if (!line) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.t < from) continue;
    const v = visits.get(r.v) || { start: r.t, end: r.t, ref: "", m: 0, l: "", b: "", w: "", vl: "", ev: 0 };
    v.start = Math.min(v.start, r.t); v.end = Math.max(v.end, r.t);
    if (r.k === "start") { v.ref = r.ref || ""; v.m = r.m; v.l = r.l; v.b = r.b || ""; v.w = r.w || ""; v.vl = r.vl || ""; v.started = true; }
    if (r.k === "event") { v.ev++; events.set(r.n, (events.get(r.n) || 0) + 1); }
    visits.set(r.v, v);
  }
  const list = [...visits.values()].filter((v) => v.started);
  const dur = list.map((v) => (v.end - v.start) / 1000).sort((a, b) => a - b);
  const per = (f) => { const m = new Map(); for (const v of list) { const k = f(v); m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const day = (t) => new Date(t).toISOString().slice(0, 10);
  return {
    days, visits: list.length,
    avg_s: dur.length ? Math.round(dur.reduce((a, b) => a + b, 0) / dur.length) : 0,
    median_s: dur.length ? Math.round(dur[Math.floor(dur.length / 2)]) : 0,
    played: list.filter((v) => v.ev > 0).length,
    phone: list.filter((v) => v.m).length,
    by_day: per((v) => day(v.start)).sort((a, b) => (a[0] < b[0] ? 1 : -1)),
    from: per((v) => v.ref || "(direct)").slice(0, 20),
    lang: per((v) => v.l || "?"),
    browser: per((v) => v.b || "?"),
    width: per((v) => v.w || "?"),
    visitor_lang: per((v) => v.vl || "?"),
    length: [["< 10 s", 0, 10], ["10–60 s", 10, 60], ["1–3 min", 60, 180], ["3–10 min", 180, 600], ["> 10 min", 600, 1e9]]
      .map(([name, a, b]) => [name, dur.filter((s) => s >= a && s < b).length]),
    events: [...events.entries()].sort((a, b) => b[1] - a[1]),
  };
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mmss = (s) => (s >= 60 ? Math.floor(s / 60) + " min " + (s % 60) + " s" : s + " s");
function statsPage(s) {
  const table = (title, rows) => `<h2>${title}</h2><table>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${b}</td></tr>`).join("") || "<tr><td>—</td></tr>"}</table>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Demo stats</title>
<style>body{font:15px system-ui,sans-serif;margin:24px;max-width:760px;color:#1f2a37;background:#f6f8fa}h1{font-size:20px}h2{font-size:15px;margin:22px 0 6px}
.k{display:flex;flex-wrap:wrap;gap:10px}.k div{background:#fff;border:1px solid #dde3ea;border-radius:10px;padding:10px 14px}.k b{display:block;font-size:22px}
table{border-collapse:collapse;background:#fff}td{border-bottom:1px solid #eef1f4;padding:4px 14px 4px 0}td:last-child{text-align:right}</style>
<h1>Living Floor Plan demo — last ${s.days} days</h1>
<div class="k"><div><b>${s.visits}</b>visits</div><div><b>${mmss(s.avg_s)}</b>average time</div><div><b>${mmss(s.median_s)}</b>median time</div>
<div><b>${s.played}</b>clicked something</div><div><b>${s.phone}</b>on a phone</div></div>
${table("Visits by day", s.by_day)}${table("Time on the page", s.length)}${table("Came from", s.from)}${table("Clicked", s.events)}
${table("Page language (EN / PL)", s.lang)}${table("Visitor's own language", s.visitor_lang)}${table("Browser", s.browser)}${table("Window width (px)", s.width)}`;
}
function tokenOk(t) {
  if (!TOKEN || typeof t !== "string") return false;
  const a = Buffer.from(t), b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, body, type = "text/plain; charset=utf-8", extra = {}) => { res.writeHead(code, { "Content-Type": type, ...extra }); res.end(body); };
  if (url.pathname === "/hit" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 2048) req.destroy(); });
    req.on("end", () => { hit(body); send(204, ""); });
    return;
  }
  if (url.pathname === "/stats" || url.pathname === "/stats.json") {
    if (!tokenOk(url.searchParams.get("t"))) return send(404, "not found");
    const s = stats(Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30)));
    return url.pathname === "/stats.json" ? send(200, JSON.stringify(s), "application/json") : send(200, statsPage(s), "text/html; charset=utf-8", { "Cache-Control": "no-store" });
  }
  if (url.pathname === "/hits.jsonl" && tokenOk(url.searchParams.get("t")) && existsSync(HITS)) {
    res.writeHead(200, { "Content-Type": "application/x-ndjson" });
    return createReadStream(HITS).pipe(res);
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try { return send(200, PAGE(), "text/html; charset=utf-8", { "Cache-Control": "no-cache" }); } catch (e) { return send(500, "the demo page is missing"); }
  }
  send(404, "not found");
}).listen(PORT, () => console.log(`demo on :${PORT}, data ${DATA}${TOKEN ? "" : " (no DEMO_STATS_TOKEN: /stats is off)"}`));
