// Devices on the plan for the editor: lights, sensors, climate readings,
// cameras, appliances, TV, A/C, door locks. Pure functions on the model v2.
//
// Positions are in cm. Sizes the card draws in SVG units (glow radius,
// camera range) are given in cm here too and converted by the generator.

import { wallThickness } from "../generator/model-v2.js";
import { faceAt, inset, pointInPolygon } from "../generator/rooms.js";
import { ICON_KINDS } from "../generator/icons.js";

// palette: what the devices tool can place, in groups
export const DEVICE_GROUPS = {
  g_lights: ["ceiling", "wall", "night", "rail", "strip", "fixture"],
  g_sensors: ["presence", "motion", "climate", "smoke", "co", "leak", "air"],
  g_security: ["camera", "lock", "gate"],
  g_climate: ["ac", "thermostat", "trv", "recuperator", "boiler", "fan", "purifier"],
  g_outside: ["bin", "mailbox", "irrigation", "weather"],
  g_energy: ["solar", "battery", "ev", "plug"],
  g_other: ["info", "tv", "media", "appliance", "skylight", "vacuum", "valve"],
  g_notes: ["text", "marker", "arrow"],
};
export const DEVICE_TYPES = Object.values(DEVICE_GROUPS).flat();
// placed with two clicks (start and end)
export const TWO_POINT = ["rail", "strip", "arrow"];
// light kinds
export const LIGHT_KINDS = ["ceiling", "wall", "night", "rail", "strip"];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const r2 = (v) => Math.round(v * 100) / 100;
const rp = (p) => [r2(p[0]), r2(p[1])];

// Every id the generated SVG will contain for devices - they must not repeat.
function usedIds(m) {
  const ids = new Set();
  for (const l of m.lights || []) { ids.add(l.id); for (const c of l.circuits || []) ids.add(c.id); }
  for (const x of [...(m.devices || []), ...(m.cameras || []), ...(m.locks || [])]) ids.add(x.id);
  for (const c of m.climate || []) ids.add("climate-" + c.id);
  for (const x of m.notes || []) ids.add(x.id);
  return ids;
}
export function uniqueId(m, prefix) {
  const used = usedIds(m);
  let i = 1;
  while (used.has(`${prefix}-${i}`) || used.has(`climate-${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}

// The room a point is in (id), for clipping glows; null outside.
export function roomOf(m, p) {
  let best = null, bestA = Infinity;
  for (const r of m.rooms || []) {
    let poly = r.points;
    if (!poly && r.at) { const f = faceAt(m, r.at); poly = f && inset(f); }
    if (!poly || !pointInPolygon(p, poly)) continue;
    let a = 0;
    for (let i = 0; i < poly.length; i++) a += poly[i][0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * poly[i][1];
    a = Math.abs(a / 2);
    if (a < bestA) { best = r.id; bestA = a; }
  }
  return best;
}

// A wall (or night) light hangs on the nearest wall face, pointing away from it:
// rotation of the bulb icon (0 = pointing up / -y). null when no wall is near.
export function wallRotation(m, p, reach = 60) {
  let best = null, bd = reach;
  for (const w of m.walls || []) {
    const d = sub(w.b, w.a), L2 = d[0] * d[0] + d[1] * d[1];
    if (!L2) continue;
    const t = Math.max(0, Math.min(1, ((p[0] - w.a[0]) * d[0] + (p[1] - w.a[1]) * d[1]) / L2));
    const q = [w.a[0] + d[0] * t, w.a[1] + d[1] * t];
    const dist = len(sub(p, q)) - wallThickness(m, w) / 2;
    if (dist < bd) { bd = dist; best = sub(p, q); }
  }
  if (!best || !len(best)) return null;
  const n = [best[0] / len(best), best[1] / len(best)];
  return Math.round((Math.atan2(n[0], -n[1]) * 180) / Math.PI + 360) % 360;
}

// Room / outdoor of a light after it moved.
function placeLight(m, l) {
  const p = (l.bulbs && l.bulbs[0]) || (l.at) || (l.strip && [l.strip[0] + l.strip[2] / 2, l.strip[1] + l.strip[3] / 2]);
  const room = p && roomOf(m, p);
  if (room) { l.room = room; delete l.outdoor; } else { delete l.room; if ((m.rooms || []).length) l.outdoor = true; }
}
function placeDevice(m, d, p) {
  const room = roomOf(m, p);
  if (room) d.room = room; else delete d.room;
}

// A new element of palette type `type` at p (and q for two-point ones).
// -> {list: "lights" | "devices" | "climate" | "cameras" | "locks", item}
export function makeDevice(m, type, p, q = null) {
  p = rp(p);
  if (["ceiling", "wall", "night"].includes(type)) {
    const l = { id: uniqueId(m, "light"), entity: "", kind: type, bulbs: [p] };
    if (type === "wall" || type === "night") { const rot = wallRotation(m, p); if (rot !== null) l.bulbs = [[...p, rot]]; }
    placeLight(m, l);
    return { list: "lights", item: l };
  }
  if (type === "rail") {
    const l = { id: uniqueId(m, "light"), entity: "", kind: "rail", bulbs: [p, rp(q)], rail: [p, rp(q)] };
    placeLight(m, l);
    return { list: "lights", item: l };
  }
  if (type === "strip") {
    // axis-aligned band, 1 cm thick, from p to q (q snapped to the same row / column)
    const horiz = Math.abs(q[0] - p[0]) >= Math.abs(q[1] - p[1]);
    const x0 = Math.min(p[0], horiz ? q[0] : p[0]), y0 = Math.min(p[1], horiz ? p[1] : q[1]);
    const strip = horiz ? [x0, r2(p[1] - 0.5), r2(Math.abs(q[0] - p[0])), 1] : [r2(p[0] - 0.5), y0, 1, r2(Math.abs(q[1] - p[1]))];
    const l = { id: uniqueId(m, "light"), entity: "", kind: "strip", strip };
    placeLight(m, l);
    return { list: "lights", item: l };
  }
  if (type === "fixture") {
    const id = uniqueId(m, "fixture");
    const f = { id, type: "fixture", kind: "main", at: p,
      circuits: [{ id: id + "-large", entity: "", r: 194 }, { id: id + "-small", entity: "", r: 124, dim: true }] };
    placeLight(m, f);
    return { list: "lights", item: f };
  }
  if (type === "presence") {
    const d = { id: uniqueId(m, "presence"), type: "presence", entity: "", at: p, hit: [r2(p[0] - 17.6), r2(p[1] - 17.6), 35.3, 35.3] };
    placeDevice(m, d, p);
    return { list: "devices", item: d };
  }
  if (type === "appliance") {
    const d = { id: uniqueId(m, "appliance"), type: "appliance", entity: "", hit: [r2(p[0] - 30), r2(p[1] - 30), 60, 60],
      glow: { at: p, r: 75 }, alert: false };
    placeDevice(m, d, p);
    return { list: "devices", item: d };
  }
  if (type === "tv" || type === "ac") {
    // hung on a wall: lengthwise along it (a vertical wall turns it by 90 degrees)
    const [w, h, rx, ry] = type === "tv" ? [124, 24, 110, 88] : [116, 32, 130, 85];
    const rot = wallRotation(m, p, 80);
    const turn = rot === 90 || rot === 270;
    // a TV and an A/C light up only their front: half a circle, away from the wall
    const d = { id: uniqueId(m, type), type: type === "tv" ? "tv" : "climate_unit", entity: "", hit: [0, 0, 0, 0],
      glow: { at: p, rx: turn ? ry : rx, ry: turn ? rx : ry }, beam: 180, beam_dir: rot ?? 180 };
    d.hit = turn ? [r2(p[0] - h / 2), r2(p[1] - w / 2), h, w] : [r2(p[0] - w / 2), r2(p[1] - h / 2), w, h];
    placeDevice(m, d, p);
    return { list: "devices", item: d };
  }
  if (type === "skylight") {
    // a roof window (78 x 118 cm, the most common size): its cover and its contact
    const d = { id: uniqueId(m, "skylight"), type: "skylight", entity: "", hit: [r2(p[0] - 39), r2(p[1] - 59), 78, 118] };
    placeDevice(m, d, p);
    return { list: "devices", item: d };
  }
  if (type === "climate") {
    return { list: "climate", item: { id: uniqueId(m, "climate").replace(/^climate-/, "sensor-"), at: p, temperature: "", humidity: "" } };
  }
  if (type === "camera") {
    return { list: "cameras", item: { id: uniqueId(m, "camera"), name: "", entity: "", entity_hq: "", at: p,
      direction: 90, fov: 100, range: 81 } };
  }
  // notes: text, a marker pin, an arrow (list "notes", drawn by generator/notes.js)
  if (type === "text") return { list: "notes", item: { id: uniqueId(m, "text"), type: "text", at: p, text: "Text", size: 24 } };
  if (type === "marker") return { list: "notes", item: { id: uniqueId(m, "marker"), type: "marker", at: p, icon: "pin", text: "" } };
  if (type === "arrow") return { list: "notes", item: { id: uniqueId(m, "arrow"), type: "arrow", from: p, to: rp(q) } };
  if (type === "lock") return { list: "locks", item: { id: uniqueId(m, "lock"), entity: "", at: p } };
  if (type === "motion") {
    // an alarm motion detector: its detection range as a fan (cm)
    const d = { id: uniqueId(m, "motion"), type: "motion", entity: "", at: p, direction: 90, fov: 100, range: 400 };
    placeDevice(m, d, p);
    return { list: "devices", item: d };
  }
  if (ICON_KINDS.includes(type)) {
    const d = { id: uniqueId(m, type), type: "icon", kind: type, entity: "", at: p };
    placeDevice(m, d, p);
    return { list: "devices", item: d };
  }
  throw new Error("unknown device type " + type);
}

// The point of a polyline nearest to p (a bulb kept on its rail) -> [x, y]
export function onPolyline(pts, p) {
  let best = pts[0], bd = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], d = sub(b, a), L2 = d[0] * d[0] + d[1] * d[1];
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)) : 0;
    const q = [a[0] + d[0] * t, a[1] + d[1] * t], dd = len(sub(q, p));
    if (dd < bd) { bd = dd; best = q; }
  }
  return rp(best);
}

// Where an element is drawn (its handle): [x, y]
export function anchor(list, x, bulb = 0) {
  if (list === "lights") {
    if (x.type === "fixture") return x.at;
    if (x.bulbs && x.bulbs.length) return x.bulbs[Math.min(bulb, x.bulbs.length - 1)].slice(0, 2);
    if (x.strip) return [x.strip[0] + x.strip[2] / 2, x.strip[1] + x.strip[3] / 2];
    if (x.rail && x.rail.length) return x.rail[0];
  }
  if (x.at) return x.at;
  if (x.from && x.to) return [(x.from[0] + x.to[0]) / 2, (x.from[1] + x.to[1]) / 2];
  if (x.hit) return [x.hit[0] + x.hit[2] / 2, x.hit[1] + x.hit[3] / 2];
  return [0, 0];
}

// Every handle on the plan: [{list, i, bulb, p}] - for hit-testing clicks.
export function handles(m) {
  const out = [];
  (m.lights || []).forEach((l, i) => {
    if (l.bulbs && l.bulbs.length) l.bulbs.forEach((b, k) => out.push({ list: "lights", i, bulb: k, p: b.slice(0, 2) }));
    else out.push({ list: "lights", i, bulb: 0, p: anchor("lights", l) });
  });
  for (const list of ["devices", "climate", "cameras", "locks", "notes"]) (m[list] || []).forEach((x, i) => out.push({ list, i, bulb: 0, p: anchor(list, x) }));
  return out;
}

// Move an element so its handle is at p: a light moves only the grabbed bulb
// (and a rail end there); everything else moves as a whole.
export function moveTo(m, list, x, p, bulb = 0) {
  p = rp(p);
  const from = anchor(list, x, bulb);
  const d = sub(p, from);
  const shift = (q) => rp(add(q, d));
  if (list === "lights") {
    if (x.type === "fixture") x.at = p;
    else if (x.bulbs && x.bulbs.length) {
      const old = x.bulbs[bulb];
      // a bulb on a rail slides along the rail (the rail's shape is edited by its corners)
      x.bulbs[bulb] = [...(x.rail && x.rail.length > 1 ? onPolyline(x.rail, p) : p), ...old.slice(2)];
      if (x.kind === "wall" || x.kind === "night") { const rot = wallRotation(m, p); if (rot !== null) x.bulbs[bulb] = [...p, rot]; }
    } else if (x.strip) { x.strip = [r2(x.strip[0] + d[0]), r2(x.strip[1] + d[1]), x.strip[2], x.strip[3]]; }
    if (x.glows) x.glows = x.glows.map((g) => ({ ...g, at: shift(g.at) }));
    placeLight(m, x);
    return;
  }
  if (x.at) x.at = shift(x.at);
  if (x.from && x.to) { x.from = shift(x.from); x.to = shift(x.to); }
  if (x.hit) x.hit = [r2(x.hit[0] + d[0]), r2(x.hit[1] + d[1]), x.hit[2], x.hit[3]];
  if (x.glow) x.glow = { ...x.glow, at: shift(x.glow.at) };
  if (x.labels) x.labels = { ...x.labels, at: shift(x.labels.at) };
  // a TV / A/C moved to another wall faces away from it
  if (x.beam && (x.type === "tv" || x.type === "climate_unit")) {
    const rot = wallRotation(m, anchor(list, x), 80);
    if (rot !== null) x.beam_dir = rot;
  }
  if (list === "devices") placeDevice(m, x, anchor(list, x));
}

// Resize an axis-aligned hit area around its middle (TV, A/C, appliance).
export function resizeHit(x, w, h) {
  const c = [x.hit[0] + x.hit[2] / 2, x.hit[1] + x.hit[3] / 2];
  x.hit = [r2(c[0] - w / 2), r2(c[1] - h / 2), r2(w), r2(h)];
}
