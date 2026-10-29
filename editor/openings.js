// Openings on walls (windows, doors, ...): placement rules for the editor.
// Pure functions on the model v2 - no DOM.

import { wallThickness, wallEnds } from "../generator/model-v2.js";

export const OPENING_TYPES = ["window", "hst", "corner_window", "balcony_door", "door", "double_door", "sliding_door", "pocket_door",
  "garage_door", "double_gate", "passage"];
// the openings tool's two tabs; "window_2" is a window of two panes (with "window": the two most common)
export const WINDOW_KINDS = ["window", "window_2", "balcony_door", "balcony_door_2", "balcony_door_3", "hst", "corner_window"];
export const DOOR_KINDS = ["door", "double_door", "sliding_door", "pocket_door", "garage_door", "double_gate", "passage"];
// variants of a type: its panes and which of them open (the panes list in the panel changes them)
const VARIANTS = { window_2: { type: "window", panes: 2 },
  balcony_door_2: { type: "balcony_door", panes: 2, pane_open: ["from", "to"] },
  balcony_door_3: { type: "balcony_door", panes: 3, pane_open: ["from", "fixed", "to"] } };
export const kindType = (k) => (VARIANTS[k] ? VARIANTS[k].type : k);
export const DEFAULT_WIDTH = { window: 90, window_2: 150, balcony_door_2: 160, balcony_door_3: 240, hst: 250, corner_window: 150, balcony_door: 90, door: 90, double_door: 160, sliding_door: 90,
  pocket_door: 90, garage_door: 250, double_gate: 300, passage: 90 };
// have a hinge / swing side (a pocket door: the side of its pocket)
export const DOOR_TYPES = ["door", "double_door", "sliding_door", "pocket_door", "balcony_door", "double_gate"];
export const GLAZED = ["window", "hst", "corner_window", "balcony_door"];           // can carry a cover
const TWO_LEAVES = ["double_door", "double_gate"];
const ID_PREFIX = { window: "window", hst: "sliding-window", corner_window: "corner-window", balcony_door: "balcony-door", door: "door",
  double_door: "double-door", sliding_door: "sliding-door", pocket_door: "pocket-door", garage_door: "garage-door", double_gate: "gate" };
const SASH_OFFSET = 5.3;  // cm, the two sashes of a sliding window sit this far either side of the axis
const SASH_SHARE = 0.55;  // each sash covers this part of the opening (they overlap in the middle)

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);

export function frame(w) {
  const d = sub(w.b, w.a), L = len(d);
  const u = [d[0] / L, d[1] / L];
  return { L, u, n: [-u[1], u[0]] };
}

// Usable stretch of a wall along its axis (cm from a): between the inner faces
// at its two ends (a corner's inner face is the shorter of the two faces).
export function innerRange(model, w) {
  const A = wallEnds(model, w, "a"), B = wallEnds(model, w, "b");
  return [Math.max(A.left, A.right), Math.min(B.left, B.right)];
}

// Which side of an exterior wall is outside: the one facing away from the
// middle of all exterior walls. -> { outside: "left" | "right", facade }
export function outsideOf(model, w) {
  const ext = model.walls.filter((x) => x.type === "exterior");
  const pts = ext.flatMap((x) => [x.a, x.b]);
  const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
  const { n } = frame(w);
  const mid = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2];
  const left = dot(n, sub(mid, c)) > 0;
  const out = left ? n : [-n[0], -n[1]];
  const facade = Math.abs(out[0]) > Math.abs(out[1]) ? (out[0] > 0 ? "east" : "west") : (out[1] > 0 ? "south" : "north");
  return { outside: left ? "left" : "right", facade };
}

// Place an opening of `width` centred near `s` (cm along the axis) on wall w:
// its distance from the inner face snapped to `grid`, kept inside the wall and
// off the other openings. -> {from, to} or null when it does not fit.
export function fitOpening(model, w, s, width, grid, skip = null, type = null) {
  // a corner window runs to the end of the wall nearest to s: the glass meets the next wall's at the corner
  if (type === "corner_window") {
    const { L } = frame(w);
    if (width > L - 1e-6) return null;
    const start = s < L / 2;
    const [from, to] = cornerRange(model, w, start ? "a" : "b", width);
    for (const o of w.openings || []) if (o !== skip && from < o.to - 1e-6 && to > o.from + 1e-6) return null;
    return { from: r2(from), to: r2(to) };
  }
  const [s0, s1] = innerRange(model, w);
  if (width > s1 - s0 + 1e-6) return null;
  let from = s - width / 2;
  if (grid) from = s0 + Math.round((from - s0) / grid) * grid;
  from = Math.max(s0, Math.min(s1 - width, from));
  const to = from + width;
  for (const o of w.openings || []) {
    if (o === skip) continue;
    if (from < o.to - 1e-6 && to > o.from + 1e-6) return null;
  }
  return { from: r2(from), to: r2(to) };
}

export function uniqueId(model, type) {
  const prefix = ID_PREFIX[type] || type;
  const used = new Set(model.walls.flatMap((w) => (w.openings || []).map((o) => o.id)));
  let i = 1;
  while (used.has(`${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}

// A new opening object for wall w. `side`: the side of the wall the cursor is
// on ("left" | "right") - doors open towards it.
export function makeOpening(model, w, kind, from, to, { hinge = "from", side = "left" } = {}) {
  const type = kindType(kind);
  const o = { type };
  if (type !== "passage") o.id = uniqueId(model, type);
  o.from = from; o.to = to;
  if (w.type === "exterior" && type !== "passage") Object.assign(o, outsideOf(model, w));
  if (DOOR_TYPES.includes(type)) { o.hinge = hinge; o.swing = side; }
  // a balcony door opens into the house, whichever side it was put in from
  if (type === "balcony_door" && o.outside) o.swing = o.outside === "left" ? "right" : "left";
  if (VARIANTS[kind] && VARIANTS[kind].panes) o.panes = VARIANTS[kind].panes;
  if (VARIANTS[kind] && VARIANTS[kind].pane_open) o.pane_open = [...VARIANTS[kind].pane_open];
  if (TWO_LEAVES.includes(type)) delete o.hinge;
  // a corner window: which end of the wall it reaches (the wall's corner is glass there)
  setCorner(o, frame(w).L);
  if (type === "hst") o.sashes = sashes(o, w.type === "exterior" ? o.outside : "left");
  return o;
}

// The fixed sash on the outside, the sliding one inside, overlapping in the middle.
export function sashes(o, outside = "left") {
  const W = o.to - o.from, s = outside === "left" ? 1 : -1;
  return {
    fixed: { from: o.from, to: r2(o.from + W * SASH_SHARE), offset: SASH_OFFSET * s },
    sliding: { from: r2(o.to - W * SASH_SHARE), to: o.to, offset: -SASH_OFFSET * s },
  };
}

// Change an opening's type in place, keeping its position and what still applies.
export function retype(model, w, o, type) {
  const keep = { id: o.id, from: o.from, to: o.to, hinge: o.hinge, swing: o.swing };
  for (const k of Object.keys(o)) delete o[k];
  let { from, to } = keep;
  if (type === "corner_window") {
    // to the nearer end of the wall, if it fits there
    const f = fitOpening(model, w, (from + to) / 2, to - from, 0, o, "corner_window");
    if (f) ({ from, to } = f);
  }
  Object.assign(o, makeOpening(model, w, type, from, to, { hinge: keep.hinge || "from", side: keep.swing || "left" }));
  if (keep.id && type !== "passage") o.id = keep.id;
}

// A corner window is two openings, one on each wall of the corner, joined by `pair` (each other's id).
// The wall meeting w at its end `end` ("a" | "b"): one ending there (or within a wall's thickness of it,
// a wall drawn to the outer corner) -> { wall, end } of that wall, or null.
export function cornerPartner(model, w, end) {
  const c = w[end], u = frame(w).u;
  let best = null, bd = Infinity;
  for (const x of model.walls) {
    if (x === w) continue;
    const fx = frame(x).u;
    if (Math.abs(fx[0] * u[0] + fx[1] * u[1]) > 0.9) continue;           // parallel: not a corner
    const reach = (wallThickness(model, w) + wallThickness(model, x)) / 2 + 2;
    for (const e of ["a", "b"]) {
      const d = len(sub(x[e], c));
      if (d <= reach && d < bd) { bd = d; best = { wall: x, end: e }; }
    }
  }
  return best;
}
// Where a corner window's glass starts and ends on wall w (cm along its axis) when it is `width` long,
// measured from where the two walls' centre lines meet - the same on both walls, however each wall was
// drawn (to the other wall's centre line or to the outer corner) -> [from, to]
export function cornerRange(model, w, end, width) {
  const { L, u } = frame(w);
  const p = cornerPartner(model, w, end);
  let s0 = end === "a" ? 0 : L;
  if (p) {
    const x = p.wall, e = frame(x).u, c = u[0] * e[1] - u[1] * e[0];
    if (Math.abs(c) > 1e-9) s0 = ((x.a[0] - w.a[0]) * e[1] - (x.a[1] - w.a[1]) * e[0]) / c;
  }
  return end === "a" ? [r2(s0), r2(s0 + width)] : [r2(s0 - width), r2(s0)];
}
// The building's outer corner at wall w's end (cm along w's axis): where the outer faces of w and the
// exterior wall meeting it there cross - also when one of them was drawn to the outer corner and the
// other to the centre line. null without such a wall.
export function outerCornerAt(model, w, end) {
  const { u, n } = frame(w);
  const ext = { ...model, walls: model.walls.filter((x) => x === w || x.type === w.type) };
  const p = cornerPartner(ext, w, end);
  if (!p) return null;
  const x = p.wall, fx = frame(x);
  const dx = p.end === "a" ? fx.u : [-fx.u[0], -fx.u[1]];
  const dw = end === "a" ? u : [-u[0], -u[1]];
  const hw = wallThickness(model, w) / 2, hx = wallThickness(model, x) / 2;
  // the outer faces: the outside of each wall (a concave corner too)
  const sw = outsideOf(model, w).outside === "left" ? 1 : -1, sx = outsideOf(model, x).outside === "left" ? 1 : -1;
  const P = [w.a[0] + n[0] * hw * sw, w.a[1] + n[1] * hw * sw];
  const Q = [x.a[0] + fx.n[0] * hx * sx, x.a[1] + fx.n[1] * hx * sx];
  const c = u[0] * fx.u[1] - u[1] * fx.u[0];
  if (Math.abs(c) < 1e-9 || !dx || !dw) return null;
  return ((Q[0] - P[0]) * fx.u[1] - (Q[1] - P[1]) * fx.u[0]) / c;
}
// The other half of a corner window (null when it has none)
export function cornerPair(model, o) {
  if (!o || !o.pair) return null;
  for (const w of model.walls) for (const x of w.openings || []) if (x.id === o.pair && x !== o) return { w, o: x };
  return null;
}
// A corner window's length, kept at its corner -> false when it does not fit
export function setCornerWidth(model, w, o, width) {
  const L = frame(w).L;
  if (!(width > 0) || width > L) return false;
  const [from, to] = cornerRange(model, w, o.corner === "to" ? "b" : "a", width);
  for (const x of w.openings || []) if (x !== o && from < x.to - 1e-6 && to > x.from + 1e-6) return false;
  o.from = from; o.to = to;
  return true;
}
// Add the other half of a new corner window on the wall meeting w at its corner (same length) -> it, or null
export function addCornerPair(model, w, o, width2 = null) {
  const p = cornerPartner(model, w, o.corner === "to" ? "b" : "a");
  if (!p) return null;
  const L = frame(p.wall).L, width = Math.min(width2 || o.to - o.from, L);
  const [from, to] = cornerRange(model, p.wall, p.end, width);
  const x = makeOpening(model, p.wall, "corner_window", from, to);
  x.corner = p.end === "a" ? "from" : "to";
  if (!setCornerWidth(model, p.wall, x, width)) return null;
  (p.wall.openings = p.wall.openings || []).push(x);
  p.wall.openings.sort((a, b) => a.from - b.from);
  o.pair = x.id; x.pair = o.id;
  return x;
}

// A corner window: the end of the wall it reaches (it snaps to one; "to" when not at the start).
export function setCorner(o, L = null) {
  // the glass may start before the wall's end (from the building's outer corner): negative from
  // (or past it): with the wall's length the nearer end decides
  if (o.type === "corner_window") o.corner = L !== null ? ((o.from + o.to) / 2 < L / 2 ? "from" : "to") : o.from <= 0.01 ? "from" : "to";
}

// Move an opening (and a sliding window's sashes) along the wall.
export function shiftOpening(o, from) {
  const d = from - o.from;
  o.from = r2(o.from + d); o.to = r2(o.to + d);
  for (const sa of Object.values(o.sashes || {})) { sa.from = r2(sa.from + d); sa.to = r2(sa.to + d); }
  setCorner(o);
}

// The opening under point p (cm), if any: {wall, opening}.
export function openingAt(model, p, extra = 0) {
  for (const w of model.walls) {
    const { L, u, n } = frame(w);
    const v = sub(p, w.a), s = dot(v, u), off = Math.abs(dot(v, n));
    if (off > wallThickness(model, w) / 2 + extra || s < -extra || s > L + extra) continue;
    for (const o of w.openings || []) if (s >= o.from - extra && s <= o.to + extra) return { wall: w, opening: o };
  }
  return null;
}

const r2 = (v) => Math.round(v * 100) / 100;
