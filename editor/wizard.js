// "A house in 5 minutes": a whole plan from a few answers - the outside size and
// which rooms - with walls, doors, windows, rooms, a light in each room and
// furniture to suit it. Pure: returns a model v2 (no DOM), the editor shows a form.
//
// The layout: the day zone (living room, kitchen open to it or not) takes one end
// of the house for its whole depth; the rest is a corridor along the house with
// rooms on both sides, the front door at its end. Enough for a start - every wall,
// door and piece can be moved afterwards.

import { shapeWalls } from "./shapes.js";
import { makeOpening } from "./openings.js";
import { FURNITURE_SIZE } from "../generator/furniture.js";
import { CM_PER_SVG_DEFAULT } from "../generator/model-v2.js";

const EXT = 40, PART = 12, CORR = 130; // cm: wall thicknesses, the corridor's clear width
// target areas (m²) and the narrowest a room may be (cm)
const ROOM = {
  bedroom: { area: 14, min: 280 }, kids: { area: 11, min: 250 }, office: { area: 9, min: 220 }, bathroom: { area: 6, min: 180 },
  wc: { area: 2.5, min: 120 }, utility: { area: 5, min: 170 }, wardrobe: { area: 4, min: 150 }, kitchen: { area: 10, min: 220 },
};
export const WIZARD_DEFAULTS = { width: 1500, depth: 1000, bedrooms: 1, kids: 1, office: true, bathrooms: 1, wc: true, utility: true,
  wardrobe: false, kitchen_open: true, furniture: true };

const r2 = (v) => Math.round(v * 100) / 100;

// answers -> { model } | { error: "too_small" | "size" }
// `names`: room type -> its name in the user's language (bedroom, kids, office, bathroom, wc, utility, wardrobe, kitchen, living, living_kitchen, hall)
export function buildHouse(a, names = {}) {
  const W = Number(a.width), D = Number(a.depth);
  if (!(W >= 600 && D >= 600 && W <= 5000 && D <= 5000)) return { error: "size" };
  const nm = (k, i, n) => (names[k] || k) + (n > 1 ? " " + (i + 1) : "");
  // the rooms off the corridor
  const want = [];
  const add = (type, count) => { for (let i = 0; i < count; i++) want.push({ type, name: nm(type, i, count) }); };
  add("bedroom", a.bedrooms | 0); add("kids", a.kids | 0); if (a.office) add("office", 1);
  add("bathroom", Math.max(0, a.bathrooms | 0)); if (a.wc) add("wc", 1); if (a.utility) add("utility", 1);
  if (a.wardrobe) add("wardrobe", 1); if (!a.kitchen_open) add("kitchen", 1);
  // axes of the outer walls
  const X0 = EXT / 2, X1 = W - EXT / 2, Y0 = EXT / 2, Y1 = D - EXT / 2;
  const yN = (Y0 + Y1) / 2 - (CORR + PART) / 2, yS = yN + CORR + PART; // the corridor's walls
  // the day zone at the east end, wide enough for its area
  const dayArea = 24 + 2.5 * want.filter((w) => ["bedroom", "kids"].includes(w.type)).length + (a.kitchen_open ? 10 : 0);
  let xL = X1 - Math.min(Math.max((dayArea * 1e4) / (D - 2 * EXT), 360), 0.6 * (W - EXT));
  // split the rooms into the north and south strips, the biggest first, balancing their areas
  const north = [], south = [];
  let an = 0, as = 0;
  for (const w of [...want].sort((p, q) => ROOM[q.type].area - ROOM[p.type].area)) {
    if (an <= as) { north.push(w); an += ROOM[w.type].area; } else { south.push(w); as += ROOM[w.type].area; }
  }
  const minW = (list) => list.reduce((s, w) => s + ROOM[w.type].min + PART, 0);
  const need = Math.max(minW(north), minW(south));
  if (need > xL - X0) {
    // narrow the day zone down to 3.6 m if that makes the rooms fit
    xL = Math.max(X0 + need, X1 - Math.max(360, X1 - xL));
    if (need > xL - X0 || X1 - xL < 300) return { error: "too_small" };
  }
  // room boundaries in a strip: widths in proportion to the target areas, at least the minimum
  const split = (list) => {
    const span = xL - X0, total = list.reduce((s, w) => s + ROOM[w.type].area, 0);
    let ws = list.map((w) => Math.max(ROOM[w.type].min + PART, (span * ROOM[w.type].area) / total));
    const k = span / ws.reduce((s, v) => s + v, 0);
    ws = ws.map((v) => v * k);
    const xs = [X0];
    for (const v of ws) xs.push(r2(Math.round((xs[xs.length - 1] + v) / 5) * 5));
    xs[xs.length - 1] = xL;
    return list.map((w, i) => ({ ...w, x0: xs[i], x1: xs[i + 1] }));
  };
  const N = split(north).map((w) => ({ ...w, y0: Y0, y1: yN, side: "north" }));
  const Sx = split(south).map((w) => ({ ...w, y0: yS, y1: Y1, side: "south" }));

  // --- walls ---------------------------------------------------------------------
  const m = { version: 2, canvas: { cm_per_svg: CM_PER_SVG_DEFAULT, rotate: 0, contract: 2, margin: 120 },
    wall_types: { exterior: { thickness: EXT }, load_bearing: { thickness: 25 }, partition: { thickness: PART } },
    walls: [], rooms: [], lights: [], devices: [], covers: [], climate: [], cameras: [], locks: [], furniture: [] };
  const [wN, wE, wS, wW] = shapeWalls("rect", { width: W, depth: D }, { thickness: EXT }).map(([p, q]) => ({ a: p, b: q, type: "exterior", openings: [] }));
  m.walls.push(wN, wE, wS, wW);
  const wall = (a, b) => { const w = { a: a.map(r2), b: b.map(r2), type: "partition", openings: [] }; m.walls.push(w); return w; };
  const corrN = wall([X0, yN], [xL, yN]), corrS = wall([X0, yS], [xL, yS]);
  // the day zone's wall: the corridor opens into it (a divider there keeps the hall a room of its own)
  wall([xL, Y0], [xL, yN]); wall([xL, yS], [xL, Y1]);
  m.dividers = [{ a: [r2(xL), r2(yN)], b: [r2(xL), r2(yS)] }];
  for (const r of N.slice(1)) wall([r.x0, Y0], [r.x0, yN]);
  for (const r of Sx.slice(1)) wall([r.x0, yS], [r.x0, Y1]);

  // openings: `at` = the middle along the wall's axis from its start
  const put = (w, type, mid, width, opts) => {
    const d = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const from = r2(Math.max(EXT, Math.min(d - EXT - width, mid - width / 2)));
    w.openings.push(makeOpening(m, w, type, from, r2(from + width), opts));
  };
  const along = (w, p) => Math.hypot(p[0] - w.a[0], p[1] - w.a[1]); // distance of a point on the axis from the wall's start
  // doors from the corridor (opening into the rooms), windows to the outside
  for (const r of [...N, ...Sx]) {
    const cx = (r.x0 + r.x1) / 2, inner = r.x1 - r.x0 - PART;
    const dw = ["bathroom", "wc", "utility", "wardrobe"].includes(r.type) ? 80 : 90;
    const doorX = Math.min(r.x1 - PART / 2 - dw / 2 - 15, Math.max(r.x0 + PART / 2 + dw / 2 + 15, r.x1 - PART / 2 - dw / 2 - 25));
    const cw = r.side === "north" ? corrN : corrS;
    put(cw, "door", along(cw, [doorX, cw.a[1]]), dw, { hinge: "to", side: r.side === "north" ? "right" : "left" });
    r.door = doorX;
    if (r.type === "wardrobe") continue;
    const ww = Math.max(60, Math.min(["wc", "bathroom", "utility"].includes(r.type) ? 80 : 150, inner - 60));
    const ext = r.side === "north" ? wN : wS;
    put(ext, "window", along(ext, [cx, ext.a[1]]), ww);
  }
  // the day zone: a sliding terrace door to the south, windows east and north; the front door at the corridor's end
  const xm = (xL + X1) / 2, dzW = X1 - xL;
  put(wS, "hst", along(wS, [xm, Y1]), Math.min(300, dzW - 120));
  put(wE, "window", along(wE, [X1, (Y0 + Y1) / 2]), Math.min(180, D - 300));
  put(wN, "window", along(wN, [xm, Y0]), Math.min(150, dzW - 150));
  put(wW, "door", along(wW, [X0, (yN + yS) / 2]), 100, { hinge: "from", side: "left" });

  // --- rooms and lights -------------------------------------------------------------
  const ids = new Set();
  const rid = (name) => { let b = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room", id = b, i = 2; while (ids.has(id)) id = `${b}-${i++}`; ids.add(id); return id; };
  const light = (room, pts) => m.lights.push({ id: `light-${room}`, entity: "", kind: "ceiling", bulbs: pts.map((p) => p.map(r2)), room });
  const box = (r) => ({ x0: r.x0 + (r.x0 === X0 ? EXT / 2 : PART / 2), x1: r.x1 - (r.x1 === X1 ? EXT / 2 : PART / 2),
    y0: r.y0 + (r.y0 === Y0 ? EXT / 2 : PART / 2), y1: r.y1 - (r.y1 === Y1 ? EXT / 2 : PART / 2) });
  for (const r of [...N, ...Sx]) {
    const b = box(r), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    r.id = rid(r.name);
    m.rooms.push({ id: r.id, name: r.name, at: c.map(r2) });
    light(r.id, [c]);
    r.box = b;
  }
  const hall = { id: rid(names.hall || "hall"), box: box({ x0: X0, x1: xL, y0: yN, y1: yS }) };
  m.rooms.push({ id: hall.id, name: names.hall || "Hall", at: [r2((X0 + xL) / 2), r2((yN + yS) / 2)] });
  light(hall.id, [[X0 + (xL - X0) / 3, (yN + yS) / 2], [X0 + ((xL - X0) * 2) / 3, (yN + yS) / 2]]);
  const day = { id: rid(a.kitchen_open ? names.living_kitchen || "Living room + kitchen" : names.living || "Living room"), box: box({ x0: xL, x1: X1, y0: Y0, y1: Y1 }) };
  m.rooms.push({ id: day.id, name: a.kitchen_open ? names.living_kitchen || "Living room + kitchen" : names.living || "Living room", at: [r2(xm), r2((Y0 + Y1) / 2)] });
  light(day.id, [[xm, Y0 + (Y1 - Y0) * 0.3], [xm, Y0 + (Y1 - Y0) * 0.72]]);

  if (a.furniture !== false) furnish(m, [...N, ...Sx], day, hall, a.kitchen_open);
  return { model: m, rooms: [...N, ...Sx].map((r) => ({ name: r.name, area: r2(((r.box.x1 - r.box.x0) * (r.box.y1 - r.box.y0)) / 1e4) })) };
}

// --- furniture to suit each room ---------------------------------------------------------------
// A piece at `at`, turned so its back (local -y) faces `back`: "n" | "e" | "s" | "w" (the wall behind it).
function piece(m, kind, at, back, size) {
  const rot = { n: 0, e: 90, s: 180, w: 270 }[back] ?? 0;
  const sz = size || FURNITURE_SIZE[kind] || [60, 60];
  let i = 1;
  while (m.furniture.some((p) => p.id === `furniture-${kind}-${i}`)) i++;
  m.furniture.push({ id: `furniture-${kind}-${i}`, kind, at: at.map(r2), size: [...sz], rot });
}
// against a wall of box b: the point `t` (0..1) along it, the piece standing out from it
function atWall(b, side, t, kind, size) {
  const [w, d] = size || FURNITURE_SIZE[kind] || [60, 60];
  if (side === "n") return [b.x0 + (b.x1 - b.x0) * t, b.y0 + d / 2];
  if (side === "s") return [b.x0 + (b.x1 - b.x0) * t, b.y1 - d / 2];
  if (side === "w") return [b.x0 + d / 2, b.y0 + (b.y1 - b.y0) * t];
  return [b.x1 - d / 2, b.y0 + (b.y1 - b.y0) * t];
}
function furnish(m, rooms, day, hall, kitchenOpen) {
  const put = (b, kind, side, t, size) => piece(m, kind, atWall(b, side, t, kind, size), side, size);
  for (const r of rooms) {
    const b = r.box, out = r.side === "north" ? "n" : "s"; // the outside wall (with the window)
    const w = b.x1 - b.x0, d = b.y1 - b.y0;
    // the door is at the corridor end of the room's east side: keep that corner free
    if (r.type === "bedroom") {
      const bed = w >= 300 ? "bed" : "bed_single";
      put(b, bed, "w", 0.5);
      const bw = FURNITURE_SIZE[bed][0];
      if (d >= bw + 120) { put(b, "nightstand", "w", 0.5 - (bw / 2 + 28) / d); put(b, "nightstand", "w", 0.5 + (bw / 2 + 28) / d); }
      if (w >= 330) put(b, "wardrobe", out, 0.75, [Math.min(200, w - 260), 60]);
    } else if (r.type === "kids") {
      put(b, "bed_single", "w", 0.5);
      put(b, "desk", out, 0.62, [Math.min(140, w - 120), 65]);
      if (w >= 260) put(b, "toy_box", r.side === "north" ? "s" : "n", 0.35);
    } else if (r.type === "office") {
      put(b, "desk", out, 0.5, [Math.min(160, w - 60), 70]);
      piece(m, "office_chair", [(b.x0 + b.x1) / 2, r.side === "north" ? b.y0 + 115 : b.y1 - 115], out);
      put(b, "bookcase", "w", 0.5);
    } else if (r.type === "bathroom") {
      if (d >= 200 && w >= 200) put(b, "bathtub", "w", 0.5, [Math.min(170, d - 20), 75]);
      else put(b, "shower", "w", r.side === "north" ? 0.3 : 0.7);
      put(b, "sink", out, 0.7);
      put(b, "wc", "e", r.side === "north" ? 0.25 : 0.75);
    } else if (r.type === "wc") {
      put(b, "wc", out, 0.5);
      put(b, "sink", "w", r.side === "north" ? 0.75 : 0.25, [45, 35]);
    } else if (r.type === "utility") {
      put(b, "washer", out, 0.25); put(b, "washer", out, 0.25 + 65 / w);
      put(b, "boiler", "w", r.side === "north" ? 0.3 : 0.7);
    } else if (r.type === "wardrobe") {
      put(b, "wardrobe", "w", 0.5, [Math.min(200, d - 20), 60]);
      if (w >= 200) put(b, "wardrobe", out, 0.6, [Math.min(160, w - 140), 60]);
    } else if (r.type === "kitchen") {
      put(b, "counter", out, 0.45, [Math.min(240, w - 100), 60]);
      put(b, "fridge", "w", r.side === "north" ? 0.25 : 0.75);
      if (d >= 280) put(b, "round_table", r.side === "north" ? "s" : "n", 0.55, [90, 90]);
    }
  }
  // the day zone: kitchen along the north wall (open plan), dining in the middle, the sofa and TV in the south
  const b = day.box, w = b.x1 - b.x0, dd = b.y1 - b.y0, cx = (b.x0 + b.x1) / 2;
  if (kitchenOpen) {
    put(b, "counter", "n", 0.5, [Math.min(300, w - 80), 60]);
    put(b, "fridge", "e", 0.12);
  }
  const ty = b.y0 + dd * (kitchenOpen ? 0.42 : 0.3);
  piece(m, "table", [cx, ty], "n", [160, 90]);
  for (const [dx, dy, back] of [[-45, -70, "s"], [45, -70, "s"], [-45, 70, "n"], [45, 70, "n"]]) piece(m, "chair", [cx + dx, ty + dy], back);
  put(b, "tv_unit", "e", 0.78);
  piece(m, "sofa", [b.x0 + 45 + 10, b.y0 + dd * 0.78], "w", [Math.min(220, dd * 0.4), 90]);
  piece(m, "coffee_table", [cx - 10, b.y0 + dd * 0.78], "n", [60, 110]);
  // the hall: shoes by the front door
  put(hall.box, "shoe_cabinet", "n", 0.12);
}
