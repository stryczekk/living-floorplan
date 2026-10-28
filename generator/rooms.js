// Rooms from walls: the area closed by wall centre lines (and dividers) around a
// point, as a polygon on the wall faces. Works for any wall angle.
//
//  - walls and dividers (virtual boundaries, not drawn, zero thickness) form a
//    planar graph: segments split where they touch or cross; free-standing
//    stubs (dead ends) are pruned - they do not enclose anything;
//  - every bounded face of the graph is a candidate room; the room is the
//    smallest face containing its point (`at`);
//  - its outline moves each edge inwards by half the thickness of its wall
//    (0 for a divider), so it runs along the wall faces.
// Openings do not matter: doors sit inside walls.

import { wallThickness } from "./model-v2.js";

const EPS = 0.01; // cm
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const key = (p) => `${Math.round(p[0] / EPS)}:${Math.round(p[1] / EPS)}`;

// Segments with their half thickness: [{a, b, h}]
// withDividers: true - all dividers; "light" - only those that stop the light
// (blocks_light: they close a glow zone too); false - walls only
function segments(model, withDividers) {
  const segs = (model.walls || []).map((w) => ({ a: w.a, b: w.b, h: wallThickness(model, w) / 2 }));
  if (withDividers) for (const d of model.dividers || []) {
    if (withDividers === "light" && !d.blocks_light) continue;
    segs.push({ a: d.a, b: d.b, h: 0 });
  }
  return reach(segs.filter((s) => Math.hypot(...sub(s.b, s.a)) > EPS));
}

// A wall drawn up to another wall's face (or a few cm short of it) instead of its centre line
// touches nothing in the graph, and the room leaks through that gap: such a free end is carried
// on, along its own direction, to the centre line it points into - or, at a corner, to the end of
// the wall whose thickness it is in (28.10). An end that already meets or crosses something close
// by is left alone: it is joined, or just sticks out past a corner.
const SHORT = 5; // cm short of the face still counts
// points where s meets o: o's ends on s, s's ends on o, a crossing
function meets(s, o) {
  const pts = [];
  const on = (p, a, b) => {
    const d = sub(b, a), L2 = d[0] * d[0] + d[1] * d[1];
    const t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2;
    return t >= -1e-9 && t <= 1 + 1e-9 && Math.hypot(...sub(add(a, mul(d, t)), p)) <= EPS * 5;
  };
  for (const p of [o.a, o.b]) if (on(p, s.a, s.b)) pts.push(p);
  for (const p of [s.a, s.b]) if (on(p, o.a, o.b)) pts.push(p);
  const d = sub(s.b, s.a), e = sub(o.b, o.a), c = cross(d, e);
  if (Math.abs(c) > 1e-9) {
    const t = cross(sub(o.a, s.a), e) / c, u = cross(sub(o.a, s.a), d) / c;
    if (t > -1e-9 && t < 1 + 1e-9 && u > -1e-9 && u < 1 + 1e-9) pts.push(add(s.a, mul(d, t)));
  }
  return pts;
}
function reach(segs) {
  const out = segs.map((s) => ({ ...s }));
  for (const s of out) {
    for (const end of ["a", "b"]) {
      const p = s[end], q = end === "a" ? s.b : s.a;
      const joined = out.some((o) => o !== s && meets(s, o).some((m) => Math.hypot(...sub(m, p)) <= s.h + o.h + SHORT));
      if (joined) continue;
      const dir = sub(p, q), Ld = Math.hypot(...dir);
      if (!Ld) continue;
      const u = mul(dir, 1 / Ld);
      let best = null;
      for (const o of out) {
        if (o === s || !o.h) continue;
        const e = sub(o.b, o.a), Le = Math.hypot(...e), c = cross(u, e);
        if (!Le || Math.abs(c) / Le < 0.2) continue;          // (nearly) parallel: not pointing into it
        const tt = cross(sub(o.a, p), e) / c;                  // distance along u to o's centre line
        const v = cross(sub(o.a, p), u) / c;                   // where on o
        if (tt <= EPS || tt > (o.h + SHORT) / (Math.abs(c) / Le)) continue;
        if (v < -1e-6 || v > 1 + 1e-6) continue;
        if (best === null || tt < best) best = tt;
      }
      if (best !== null) { s[end] = add(p, mul(u, best)); continue; }
      // near a corner: inside a wall's thickness close to its end - joined to that end
      let node = null, nd = Infinity;
      for (const o of out) {
        if (o === s || !o.h) continue;
        for (const n of [o.a, o.b]) {
          const dd = Math.hypot(...sub(n, p));
          if (dd > EPS && dd <= o.h * Math.SQRT2 + SHORT && dd < nd) { nd = dd; node = n; }
        }
      }
      if (node) s[end] = [...node];
    }
  }
  return out;
}

// Split segments at every point where another one touches or crosses them.
function split(segs) {
  const out = [];
  for (const s of segs) {
    const d = sub(s.b, s.a), L2 = d[0] * d[0] + d[1] * d[1];
    const ts = [0, 1];
    for (const o of segs) {
      if (o === s) continue;
      for (const p of [o.a, o.b]) {       // an end of o on s (T-joint)
        const t = ((p[0] - s.a[0]) * d[0] + (p[1] - s.a[1]) * d[1]) / L2;
        if (t <= 0 || t >= 1) continue;
        const q = add(s.a, mul(d, t));
        if (Math.hypot(...sub(q, p)) <= EPS * 5) ts.push(t);
      }
      const e = sub(o.b, o.a), c = cross(d, e);  // a proper crossing
      if (Math.abs(c) < 1e-9) continue;
      const t = cross(sub(o.a, s.a), e) / c, u = cross(sub(o.a, s.a), d) / c;
      if (t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i++) {
      if (ts[i + 1] - ts[i] < 1e-9) continue;
      out.push({ a: add(s.a, mul(d, ts[i])), b: add(s.a, mul(d, ts[i + 1])), h: s.h });
    }
  }
  return out;
}

// Bounded faces of the graph: [{edges: [{a, b, h}], area}] - each face's edges
// run with the face on their LEFT in screen terms (normal (-dy, dx) points... see inset()).
export function faces(model, { withDividers = true } = {}) {
  const segs = split(segments(model, withDividers));
  // nodes and half-edges
  const nodes = new Map();
  const node = (p) => {
    const k = key(p);
    if (!nodes.has(k)) nodes.set(k, { p, out: [] });
    return nodes.get(k);
  };
  const edges = [];
  const seen = new Set();
  for (const s of segs) {
    const A = node(s.a), B = node(s.b);
    if (A === B) continue;
    const k = [key(s.a), key(s.b)].sort().join("|");
    if (seen.has(k)) continue; // overlapping duplicates
    seen.add(k);
    const e1 = { from: A, to: B, h: s.h }, e2 = { from: B, to: A, h: s.h };
    e1.twin = e2; e2.twin = e1;
    A.out.push(e1); B.out.push(e2);
    edges.push(e1, e2);
  }
  // prune dead ends (a node with one edge left), repeatedly
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const n of nodes.values()) {
      const live = n.out.filter((e) => !e.dead);
      if (live.length === 1) { live[0].dead = live[0].twin.dead = true; pruned = true; }
    }
  }
  const ang = (e) => Math.atan2(e.to.p[1] - e.from.p[1], e.to.p[0] - e.from.p[0]);
  for (const n of nodes.values()) n.out = n.out.filter((e) => !e.dead).sort((x, y) => ang(x) - ang(y));
  // walk: after arriving along e at node v, leave by the edge next to twin(e)
  // in angular order - this traces faces with consistent orientation
  const used = new Set();
  const out = [];
  for (const e0 of edges) {
    if (e0.dead || used.has(e0)) continue;
    const ring = [];
    let e = e0, guard = 0;
    while (!used.has(e) && guard++ < 100000) {
      used.add(e);
      ring.push(e);
      const v = e.to, list = v.out, i = list.indexOf(e.twin);
      e = list[(i - 1 + list.length) % list.length];
    }
    const pts = ring.map((x) => x.from.p);
    const area = signedArea(pts);
    if (area > EPS) out.push({ edges: ring.map((x) => ({ a: x.from.p, b: x.to.p, h: x.h })), area, pts });
  }
  return out;
}

export function signedArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) s += cross(pts[i], pts[(i + 1) % pts.length]);
  return s / 2;
}

export function pointInPolygon(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// The smallest face around p, or null when p is not enclosed.
export function faceAt(model, p, opts) {
  let best = null;
  for (const f of faces(model, opts)) if (pointInPolygon(p, f.pts) && (!best || f.area < best.area)) best = f;
  return best;
}

// Outline of a face along the wall faces: each edge moved inwards by its half
// thickness, corners where the moved lines cross.
export function inset(face) {
  const E = face.edges;
  const n = E.length;
  // positive signed area here = the inside is on the side of (-dy, dx)... checked
  // numerically: move along that normal for each edge
  const lines = E.map((e) => {
    const d = sub(e.b, e.a), L = Math.hypot(...d), u = mul(d, 1 / L), nrm = [-u[1], u[0]];
    return { p: add(e.a, mul(nrm, e.h)), u, h: e.h, end: add(e.b, mul(nrm, e.h)) };
  });
  const pts = [];
  for (let i = 0; i < n; i++) {
    const A = lines[i], B = lines[(i + 1) % n];
    const c = cross(A.u, B.u);
    if (Math.abs(c) < 1e-9) {
      // straight on: same offset -> no corner here; a step in thickness -> two points
      if (Math.abs(A.h - B.h) > 1e-9) pts.push(A.end, B.p);
      continue;
    }
    const t = cross(sub(B.p, A.p), B.u) / c;
    const q = add(A.p, mul(A.u, t));
    // nearly straight on (a boundary drawn a little askew): the corner of the offset lines runs off
    // far away - two points instead, the end of one and the start of the next (a miter limit)
    if (Math.hypot(...sub(q, E[i].b)) > 3 * Math.max(A.h, B.h) + 1) { pts.push(A.end, B.p); continue; }
    pts.push(q);
  }
  return pts.map((q) => [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100]);
}

// Polygon (cm) of the room around p - with or without the dividers.
export function roomPolygon(model, p, opts) {
  const f = faceAt(model, p, opts);
  return f ? inset(f) : null;
}

export function area(poly) { return Math.abs(signedArea(poly)); }
export function perimeter(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) s += Math.hypot(...sub(poly[(i + 1) % poly.length], poly[i]));
  return s;
}
