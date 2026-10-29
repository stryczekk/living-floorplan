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
  g_lights: ["ceiling", "wall", "night", "spot", "rail", "strip", "fixture", "pendant", "floor_lamp", "table_lamp", "garden_lamp"],
  g_sensors: ["presence", "motion", "climate", "smoke", "co", "leak", "gas", "air", "lux", "vibration", "button"],
  g_security: ["camera", "doorbell", "lock", "gate", "alarm_panel", "keypad", "siren", "nvr"],
  g_climate: ["ac", "thermostat", "trv", "radiator", "floor_heating", "recuperator", "boiler", "heat_pump", "water_tank", "fireplace",
    "fan", "purifier", "dehumidifier", "humidifier"],
  g_outside: ["bin", "mailbox", "intercom", "irrigation", "rain", "pool_pump", "weather"],
  g_energy: ["meter", "fuse_box", "solar", "inverter", "battery", "ups", "ev", "plug", "power_strip"],
  g_appliances: ["fridge", "fridge_sbs", "freezer", "dishwasher", "oven", "cooktop", "microwave", "hood", "coffee", "washer", "dryer",
    "washer_dryer", "washdry", "wine_fridge", "vacuum", "mower", "appliance"],
  g_av: ["tv", "soundbar", "media", "amplifier", "set_top", "projector", "console", "printer"],
  g_network: ["rack", "router", "net_switch", "ap", "nas", "zigbee"],
  g_other: ["info", "skylight", "valve"],
  g_notes: ["text", "marker", "arrow"],
};
export const DEVICE_TYPES = Object.values(DEVICE_GROUPS).flat();
// appliances drawn as themselves and their default size (cm, along the wall x out from it)
export const APPLIANCE_KINDS = { washer: [60, 60], dryer: [60, 60], fridge: [60, 60], fridge_sbs: [91, 72], dishwasher: [60, 60],
  freezer: [60, 60], oven: [60, 57], cooktop: [60, 52], microwave: [50, 40], hood: [60, 50], coffee: [25, 40],
  // audio / video drawn the same way (on while playing)
  soundbar: [100, 10], projector: [30, 25], console: [30, 20],
  washdry: [60, 60], wine_fridge: [60, 57], mower: [55, 40] };
// a washer with a dryer standing on it: one place, two machines (the one on top in `top`)
export const STACKABLE = ["washer", "dryer"];
// devices of the "icon" type drawn as the thing itself rather than a badge, and their default size (cm)
export const SHAPED_KINDS = { recuperator: [75, 56], boiler: [44, 36], media: [22, 20],
  rack: [60, 60], radiator: [80, 10], heat_pump: [90, 35], water_tank: [55, 55] };
// what goes into a rack (dropped on it): its equipment, listed in `items`
export const RACK_KINDS = ["router", "net_switch", "nas", "zigbee", "nvr", "ups", "alarm_panel", "power_strip", "amplifier", "set_top"];
// lamps with a shade (seen from above) or a post: bulbs like a ceiling light
export const SHADE_KINDS = ["pendant", "floor_lamp", "table_lamp", "garden_lamp"];
// placed with two clicks (start and end)
export const TWO_POINT = ["rail", "strip", "arrow"];
// light kinds
export const LIGHT_KINDS = ["ceiling", "wall", "night", "spot", "rail", "strip", "pendant", "floor_lamp", "table_lamp", "garden_lamp"];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const r2 = (v) => Math.round(v * 100) / 100;
const rp = (p) => [r2(p[0]), r2(p[1])];

// Every id the generated SVG will contain for devices - they must not repeat.
function usedIds(m) {
  const ids = new Set();
  for (const l of m.lights || []) { ids.add(l.id); for (const c of l.circuits || []) ids.add(c.id); }
  for (const x of [...(m.devices || []), ...(m.cameras || []), ...(m.locks || [])]) {
    ids.add(x.id); if (x.top) ids.add(x.id + "-top");
    for (const it of x.items || []) ids.add(it.id);
  }
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

// The nearest wall within reach whose face p is in front of: {q: the point on its axis, n: out of it towards p,
// h: half its thickness}
export function nearestWall(m, p, reach = 80) {
  let best = null, bd = reach;
  for (const w of m.walls || []) {
    const d = sub(w.b, w.a), L2 = d[0] * d[0] + d[1] * d[1];
    if (!L2) continue;
    const t = ((p[0] - w.a[0]) * d[0] + (p[1] - w.a[1]) * d[1]) / L2;
    if (t < 0 || t > 1) continue;
    const q = [w.a[0] + d[0] * t, w.a[1] + d[1] * t], v = sub(p, q), L = Math.hypot(...v);
    const h = wallThickness(m, w) / 2, dist = L - h;
    if (L > 1e-6 && dist < bd) { bd = dist; best = { q, n: [v[0] / L, v[1] / L], h }; }
  }
  return best;
}

// A device drawn at its size (an appliance, a TV, a boiler...) placed at p: near a wall it turns its back to it
// and stands against its face (its front, beam_dir, out into the room; whole quarter turns only)
// (flush: as backToWall - against the face only when the back is that close to it, cm)
export function backDeviceToWall(m, d, p, reach = 80, flush = Infinity) {
  const w = nearestWall(m, p, reach);
  if (!w || !d.hit) return false;
  const [W, D] = wallSize(d);
  d.beam_dir = (Math.round((Math.atan2(w.n[0], -w.n[1]) * 180) / Math.PI / 90) * 90 + 360) % 360;
  const n = [[0, -1], [1, 0], [0, 1], [-1, 0]][d.beam_dir / 90];
  // keep the position along the wall, move across it to the face
  const along = sub(p, w.q), k = along[0] * n[0] + along[1] * n[1], off = w.h + D / 2;
  const c = k - off < flush ? [p[0] + n[0] * (off - k), p[1] + n[1] * (off - k)] : [p[0], p[1]];
  const [hw, hh] = n[0] ? [D, W] : [W, D];
  d.hit = [r2(c[0] - hw / 2), r2(c[1] - hh / 2), r2(hw), r2(hh)];
  if (d.glow && d.glow.at) {
    d.glow = { ...d.glow, at: rp(c) };
    if (d.glow.rx) { const big = Math.max(d.glow.rx, d.glow.ry), small = Math.min(d.glow.rx, d.glow.ry); d.glow = { ...d.glow, rx: n[0] ? small : big, ry: n[0] ? big : small }; }
  }
  if (d.at) d.at = rp(c);
  return true;
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
// free: no turning its back to a nearby wall (a device turned by hand)
export function makeDevice(m, type, p, q = null, { free = false, flush = Infinity } = {}) {
  p = rp(p);
  if (["ceiling", "wall", "night", "spot", ...SHADE_KINDS].includes(type)) {
    const l = { id: uniqueId(m, "light"), entity: "", kind: type, bulbs: [p] };
    if (type === "wall" || type === "night") { const rot = wallRotation(m, p); if (rot !== null) l.bulbs = [[...p, rot]]; }
    // a spotlight: a narrow beam, turned away from the wall near it (or down the plan)
    if (type === "spot") { const rot = wallRotation(m, p, 120); l.bulbs = [[...p, rot === null ? 180 : rot]]; l.beam = 60; }
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
  if (type === "appliance" || type === "washer_dryer" || APPLIANCE_KINDS[type]) {
    // a washer, a dryer, a fridge, a dishwasher (or any appliance): its outline, front down the plan;
    // a washer with a dryer on top: one appliance, the dryer in `top`
    const kind = type === "washer_dryer" ? "washer" : type;
    const [w, h] = APPLIANCE_KINDS[kind] || [60, 60];
    const d = { id: uniqueId(m, type === "appliance" ? "appliance" : type), type: "appliance", entity: "", hit: [r2(p[0] - w / 2), r2(p[1] - h / 2), w, h],
      glow: { at: p, r: 75 }, alert: false, ...(APPLIANCE_KINDS[kind] ? { kind, beam_dir: 180 } : {}) };
    if (type === "washer_dryer") d.top = { kind: "dryer", entity: "" };
    if (d.kind && !free) backDeviceToWall(m, d, p, 80, flush);
    placeDevice(m, d, p);
    return { list: "devices", item: d };
  }
  if (type === "tv" || type === "ac") {
    // hung on a wall: lengthwise along it (a vertical wall turns it by 90 degrees)
    const [w, h, rx, ry] = type === "tv" ? [124, 24, 110, 88] : [116, 32, 130, 85];
    const rot = free ? null : wallRotation(m, p, 80);
    const turn = rot === 90 || rot === 270;
    // a TV and an A/C light up only their front: half a circle, away from the wall
    const d = { id: uniqueId(m, type), type: type === "tv" ? "tv" : "climate_unit", entity: "", hit: [0, 0, 0, 0],
      glow: { at: p, rx: turn ? ry : rx, ry: turn ? rx : ry }, beam: 180, beam_dir: rot ?? 180 };
    d.hit = turn ? [r2(p[0] - h / 2), r2(p[1] - w / 2), h, w] : [r2(p[0] - w / 2), r2(p[1] - h / 2), w, h];
    if (!free) backDeviceToWall(m, d, p, 80, flush);
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
    // a new one is drawn as a sensor; its readings on the plan instead is a choice in its panel
    return { list: "climate", item: { id: uniqueId(m, "climate").replace(/^climate-/, "sensor-"), at: p, temperature: "", humidity: "", display: "icon" } };
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
    // a recuperator, a boiler, a speaker: drawn as the thing, of its size (cm), front down the plan
    if (SHAPED_KINDS[type]) {
      const [w, h] = SHAPED_KINDS[type];
      Object.assign(d, { hit: [r2(p[0] - w / 2), r2(p[1] - h / 2), w, h], beam_dir: 180 });
      if (!free) backDeviceToWall(m, d, p, 80, flush);
    }
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
// A washer or a dryer (without one on it already) under p: what a new washer / dryer placed at p stands on
export function stackTarget(m, p, kind) {
  if (!STACKABLE.includes(kind)) return null;
  return (m.devices || []).find((d) => d.type === "appliance" && STACKABLE.includes(d.kind) && !d.top && d.hit &&
    p[0] >= d.hit[0] && p[0] <= d.hit[0] + d.hit[2] && p[1] >= d.hit[1] && p[1] <= d.hit[1] + d.hit[3]) || null;
}

// A rack under p that a piece of equipment of this kind goes into (a router, a switch, a UPS...)
export function rackTarget(m, p, kind) {
  if (!RACK_KINDS.includes(kind)) return null;
  return (m.devices || []).find((d) => d.kind === "rack" && d.hit &&
    p[0] >= d.hit[0] && p[0] <= d.hit[0] + d.hit[2] && p[1] >= d.hit[1] && p[1] <= d.hit[1] + d.hit[3]) || null;
}

// Size along its wall (W) and out from it (D) of a device facing beam_dir (its hit is in plan axes)
export function wallSize(x) {
  const side = x.beam_dir === undefined || (((Math.round(x.beam_dir / 90) * 90) % 180) + 180) % 180 === 0;
  return side ? [x.hit[2], x.hit[3]] : [x.hit[3], x.hit[2]];
}
export function setWallSize(x, W, D) {
  const side = x.beam_dir === undefined || (((Math.round(x.beam_dir / 90) * 90) % 180) + 180) % 180 === 0;
  if (side) resizeHit(x, W, D); else resizeHit(x, D, W);
}
// A TV's screen width (cm) from its diagonal (inches), 16:9 - and back
export const tvWidth = (inch) => inch * 2.54 * 16 / Math.hypot(16, 9);
export const tvInches = (w) => w / (2.54 * 16 / Math.hypot(16, 9));

// The hit's handles: corners and sides (sx, sy in -1 / 0 / 1)
export function hitHandles(h) {
  const out = [];
  for (const sx of [-1, 0, 1]) for (const sy of [-1, 0, 1]) {
    if (!sx && !sy) continue;
    out.push({ sx, sy, p: [h[0] + h[2] * (sx + 1) / 2, h[1] + h[3] * (sy + 1) / 2] });
  }
  return out;
}
// Drag handle (sx, sy) of `base` (the hit when the drag started) to p: the opposite side stays
export function dragHit(x, base, sx, sy, p, round = (v) => v, min = 5) {
  let [x0, y0, x1, y1] = [base[0], base[1], base[0] + base[2], base[1] + base[3]];
  if (sx < 0) x0 = Math.min(x1 - min, x1 - round(x1 - p[0]));
  if (sx > 0) x1 = Math.max(x0 + min, x0 + round(p[0] - x0));
  if (sy < 0) y0 = Math.min(y1 - min, y1 - round(y1 - p[1]));
  if (sy > 0) y1 = Math.max(y0 + min, y0 + round(p[1] - y0));
  x.hit = [r2(x0), r2(y0), r2(x1 - x0), r2(y1 - y0)];
  if (x.glow && x.glow.at) x.glow = { ...x.glow, at: [r2((x0 + x1) / 2), r2((y0 + y1) / 2)] };
  if (x.at) x.at = [r2((x0 + x1) / 2), r2((y0 + y1) / 2)];
}

export function resizeHit(x, w, h) {
  const c = [x.hit[0] + x.hit[2] / 2, x.hit[1] + x.hit[3] / 2];
  x.hit = [r2(c[0] - w / 2), r2(c[1] - h / 2), r2(w), r2(h)];
}
